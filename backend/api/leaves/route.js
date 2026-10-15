import prisma from '../../lib/prisma.js';
import { sendLeaveApplicationEmail, sendLeaveStatusEmail, sendLeaveCancellationEmail } from '../../lib/email.js';
import { createNotification } from '../../lib/notification.js';
import { checkSameOrg } from '../../lib/tenant.js';
import { leaveDays, sumLeaveDays } from '../../lib/leave.js';
import { resolveManager } from '../../lib/manager.js';
import { computeInitialApprover, notifyInitial, advanceApproval, canActOn, buildSummary } from '../../lib/approval.js';
import { persistDataUrl, removeObjectByUrl } from '../../lib/minio.js';

export async function GET(req, res) {
    try {
        const { employeeId } = req.query;

        // Strict organization isolation
        let orgId = null;
        if (req.user && req.user.role !== 'super-admin') {
            if (!req.user.organizationId) {
                return res.status(401).json({ error: 'Unauthorized: No organization associated with your account' });
            }
            orgId = parseInt(req.user.organizationId);
        }

        const where = {};
        if (employeeId) {
            where.employeeId = parseInt(employeeId);
        }

        // Security: Filter by organization if restricted
        if (orgId) {
            where.employee = { organizationId: orgId };
        }

        const leaves = await prisma.leave.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        name: true,
                        photo: true,
                        role: true,
                        organizationId: true
                    }
                }
            },
            orderBy: { startDate: 'desc' }
        });
        res.json(leaves);
    } catch (error) {
        console.error('Error fetching leaves:', error);
        res.status(500).json({
            error: 'Failed to fetch leaves',
            details: error.message
        });
    }
}

export async function POST(req, res) {
    try {
        console.log('POST /api/leaves body:', { ...req.body, document: req.body.document ? '[base64]' : undefined });
        const { type, startDate, endDate, isHalfDay, reason, employeeId, document } = req.body;
        console.log('POST /api/leaves received request for employee:', employeeId);

        if (!type || !startDate || !endDate || employeeId === undefined || employeeId === null) {
            const missing = [];
            if (!type) missing.push('type');
            if (!startDate) missing.push('startDate');
            if (!endDate) missing.push('endDate');
            if (employeeId === undefined || employeeId === null) missing.push('employeeId');

            console.log('POST /api/leaves: Missing fields:', missing);
            return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
        }

        const eid = parseInt(employeeId);

        // Check if employee exists
        const employee = await prisma.employee.findUnique({
            where: { id: eid }
        });

        if (employee && !checkSameOrg(req, res, employee)) return;

        if (!employee) {
            console.log(`POST /api/leaves: Employee ${eid} not found in database.`);
            return res.status(400).json({
                error: 'Invalid Employee',
                message: eid === 0
                    ? 'System Admin (ID 0) is not registered as an employee in the database and cannot apply for leave.'
                    : `Employee with ID ${eid} not found.`
            });
        }

        // --- Date validation ---
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Date',
                message: 'Please provide a valid From Date and To Date.'
            });
        }
        if (end < start) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Date Range',
                message: 'From Date cannot be after To Date.'
            });
        }

        // --- Leave start-date window ---
        // Leave may only START today ("us din") or one day ahead ("ek din pehle");
        // booking further in advance is not allowed. Only the start date is gated —
        // a multi-day leave may extend beyond tomorrow (the monthly day limit caps
        // the total). Compared on calendar-date boundaries, ignoring time of day.
        const now = new Date();
        const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const lastAllowedStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);
        const startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        if (startMidnight < todayMidnight) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Date',
                message: 'Start date cannot be in the past.'
            });
        }
        if (start > lastAllowedStart) {
            return res.status(400).json({
                success: false,
                error: 'Leave Window Exceeded',
                message: 'You can only apply for leave starting today or tomorrow.'
            });
        }

        // --- Leave quota validation (all counts exclude Sundays) ---
        // - Monthly: max 2 leave DAYS per calendar month.
        // - Yearly:  max 24 leave DAYS per year.
        // Both reserve non-Rejected leave (Approved + Pending) so a user can't
        // over-commit while requests await approval. Leave days are half-day
        // aware and skip Sundays (see lib/leave.js).
        const MONTHLY_LEAVE_LIMIT = 2;
        const ANNUAL_LEAVE_QUOTA = 24;

        const month = start.getMonth();
        const year = start.getFullYear();
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31, 23, 59, 59);

        const requestedDays = leaveDays({ startDate, endDate, isHalfDay });

        // A request made up entirely of Sundays deducts nothing — reject it so we
        // don't store a zero-day leave that confuses the balance.
        if (requestedDays === 0) {
            return res.status(400).json({
                success: false,
                error: 'No Leave Days',
                message: 'The selected range contains no working days (Sundays are not counted as leave).'
            });
        }

        // The monthly and yearly quota checks are independent reads — run them in
        // parallel so we pay one DB round-trip instead of two (Neon is remote, so
        // each sequential round-trip noticeably adds to the response time).
        const [existingMonthLeaves, existingYearLeaves] = await Promise.all([
            prisma.leave.findMany({
                where: {
                    employeeId: eid,
                    startDate: { gte: monthStart, lte: monthEnd },
                    status: { not: 'Rejected' }
                },
                select: { startDate: true, endDate: true, isHalfDay: true }
            }),
            prisma.leave.findMany({
                where: {
                    employeeId: eid,
                    startDate: { gte: yearStart, lte: yearEnd },
                    status: { not: 'Rejected' }
                },
                select: { startDate: true, endDate: true, isHalfDay: true }
            })
        ]);

        const usedMonthDays = sumLeaveDays(existingMonthLeaves);
        if (usedMonthDays + requestedDays > MONTHLY_LEAVE_LIMIT) {
            const remaining = Math.max(0, MONTHLY_LEAVE_LIMIT - usedMonthDays);
            console.log(`POST /api/leaves: Monthly day limit reached for employee ${eid} (used ${usedMonthDays} + req ${requestedDays} > ${MONTHLY_LEAVE_LIMIT})`);
            return res.status(400).json({
                success: false,
                error: 'Monthly Limit Reached',
                message: remaining === 0
                    ? `Only ${MONTHLY_LEAVE_LIMIT} leave days are allowed per month.`
                    : `Monthly leave limit exceeded. Remaining leave days: ${remaining}`
            });
        }

        const usedYearDays = sumLeaveDays(existingYearLeaves);
        if (usedYearDays + requestedDays > ANNUAL_LEAVE_QUOTA) {
            const remaining = Math.max(0, ANNUAL_LEAVE_QUOTA - usedYearDays);
            console.log(`POST /api/leaves: Yearly day limit reached for employee ${eid} (used ${usedYearDays} + req ${requestedDays} > ${ANNUAL_LEAVE_QUOTA})`);
            return res.status(400).json({
                success: false,
                error: 'Yearly Limit Reached',
                message: `This request is ${requestedDays} day(s) but you have only ${remaining} of ${ANNUAL_LEAVE_QUOTA} leave days left this year.`
            });
        }

        // Store the supporting document in MinIO and keep only its URL.
        const documentUrl = document
            ? await persistDataUrl(document, { folder: `leave-docs/org-${employee.organizationId ?? 'none'}`, docType: 'leave' })
            : null;

        // Multi-level approval: route to the employee's direct manager first
        // (or straight to the admin pool when no manager resolves).
        const { currentApproverId, approver } = await computeInitialApprover(employee, prisma);

        const leave = await prisma.leave.create({
            data: {
                type,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                isHalfDay,
                reason,
                document: documentUrl,
                employeeId: eid,
                status: 'Pending',
                currentApproverId,
                approvalHistory: []
            }
        });

        // ---------------------------------------------------------
        // BACKGROUND DISPATCH (Don't await to speed up response)
        // Notify only the first approver (manager) — or the admin pool when
        // there is no manager. Admins are no longer spammed up-front.
        // ---------------------------------------------------------
        (async () => {
            try {
                const orgForEmail = employee.organizationId
                    ? await prisma.organization.findUnique({ where: { id: employee.organizationId }, select: { id: true, name: true, logo: true, admin: true } }).catch(() => null)
                    : null;
                await notifyInitial({
                    kind: 'leave',
                    requesterName: employee.name,
                    summary: buildSummary('leave', leave),
                    approver,
                    organizationId: employee.organizationId,
                    org: orgForEmail,
                    prisma,
                });
            } catch (bgErr) {
                console.error('Background notification error:', bgErr);
            }
        })();

        res.status(201).json(leave);
    } catch (error) {
        console.error('Error creating leave:', error);
        res.status(500).json({ error: 'Failed' });
    }
}

export async function PATCH(req, res) {
    try {
        const { id } = req.params;
        const { status, note } = req.body;

        if (!['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        const action = status === 'Approved' ? 'approve' : 'reject';

        const existing = await prisma.leave.findUnique({
            where: { id: parseInt(id) },
            include: {
                employee: { select: { id: true, name: true, email: true, personalEmail: true, reportsTo: true, reportsToName: true, organizationId: true } }
            }
        });
        if (!existing) return res.status(404).json({ error: 'Leave not found' });
        if (!checkSameOrg(req, res, existing, { via: 'employee' })) return;

        // Only the current approver in the chain (or an admin at the final stage)
        // may act — and not on one's own request.
        if (!canActOn(existing, req.user)) {
            return res.status(403).json({ error: 'You are not authorized to action this request at its current stage.' });
        }

        const actorName = (await prisma.employee.findUnique({ where: { id: Number(req.user.id) }, select: { name: true } }).catch(() => null))?.name || req.user.email;
        const org = existing.employee?.organizationId
            ? await prisma.organization.findUnique({ where: { id: existing.employee.organizationId }, select: { id: true, name: true, logo: true, admin: true } }).catch(() => null)
            : null;

        const outcome = await advanceApproval({
            kind: 'leave',
            request: existing,
            requester: existing.employee,
            actor: { id: Number(req.user.id), name: actorName, role: req.user.role },
            action,
            note,
            summary: buildSummary('leave', existing),
            org,
            prisma,
        });

        const leave = await prisma.leave.update({
            where: { id: parseInt(id) },
            data: outcome.data,
            include: { employee: { select: { email: true, personalEmail: true, organizationId: true } } }
        });

        // Email the employee only once the request is finalized (approved or rejected).
        if (outcome.finalized) {
            (async () => {
                if (leave.employee?.email) {
                    try {
                        await sendLeaveStatusEmail(
                            leave.employee.email,
                            outcome.decision,
                            leave.startDate,
                            leave.endDate,
                            leave.reason,
                            org,
                            leave.employee.personalEmail
                        );
                    } catch (emailError) {
                        console.error(`Background leave status notification error for ${leave.employee.email}:`, emailError);
                    }
                }
            })();
        }

        res.json(leave);
    } catch (error) {
        console.error('Error updating leave status:', error);
        res.status(500).json({ error: 'Failed to update leave status' });
    }
}

export async function DELETE(req, res) {
    try {
        const { id } = req.params;
        console.log(`DELETE /api/leaves/${id} received`);

        const leave = await prisma.leave.findUnique({
            where: { id: parseInt(id) },
            include: { employee: true }
        });

        if (!leave) return res.status(404).json({ error: 'Leave not found' });
        if (!checkSameOrg(req, res, leave, { via: 'employee' })) return;

        await prisma.leave.delete({
            where: { id: parseInt(id) }
        });

        // Clean up storage: drop the cancelled leave's supporting document from
        // MinIO. Best-effort and fire-and-forget; removeObjectByUrl never throws.
        if (leave.document) removeObjectByUrl(leave.document);

        // ---------------------------------------------------------
        // BACKGROUND DISPATCH (Don't await to speed up response)
        // ---------------------------------------------------------
        (async () => {
            try {
                const { managerEmail, managerName } = await resolveManager(leave.employee, prisma);

                const orgForEmail = leave.employee.organizationId
                    ? await prisma.organization.findUnique({ where: { id: leave.employee.organizationId }, select: { id: true, name: true, logo: true } }).catch(() => null)
                    : null;
                
                await sendLeaveCancellationEmail(leave.employee.name, leave, managerEmail, managerName, orgForEmail);
            } catch (bgErr) {
                console.error('Background leave cancellation notification error:', bgErr);
            }
        })();

        res.status(204).send();
    } catch (error) {
        console.error('Error deleting leave:', error);
        res.status(500).json({ error: 'Failed to delete leave' });
    }
}
