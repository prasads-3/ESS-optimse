import prisma from '../../lib/prisma.js';
import { sendExpenseLimitExceededEmail } from '../../lib/email.js';
import { computeInitialApprover, notifyInitial, buildSummary } from '../../lib/approval.js';
import { persistDataUrl } from '../../lib/minio.js';

export async function POST(req, res) {
    try {
        console.log('Received expense submission:', { ...req.body, rows: Array.isArray(req.body.rows) ? `[${req.body.rows.length} items]` : req.body.rows });
        const { date, rows, employeeId } = req.body;

        // Use body employeeId or fallback to authenticated user id
        const finalEmployeeId = parseInt(employeeId || req.user?.id);

        if (!date || !rows || isNaN(finalEmployeeId)) {
            console.warn('Invalid or missing fields:', { date, rows, employeeId, finalEmployeeId });
            return res.status(400).json({ error: 'Missing or invalid required fields' });
        }

        const totalAmount = rows.reduce((acc, row) => {
            const price = parseFloat(row.price);
            return acc + (isNaN(price) ? 0 : price);
        }, 0);

        // Fetch employee's expense limit and current total expenses for the month
        const employee = await prisma.employee.findUnique({
            where: { id: finalEmployeeId },
            select: { id: true, expenseLimit: true, name: true, email: true, organizationId: true, reportsTo: true, reportsToName: true }
        });

        // Every employee starts at a 0 limit; they cannot claim until an admin
        // sets one. (There is no "0 = unlimited" rule — 0 means zero allowance.)
        if (employee) {
            const submissionDate = new Date(date);
            const startOfMonth = new Date(submissionDate.getFullYear(), submissionDate.getMonth(), 1);
            const endOfMonth = new Date(submissionDate.getFullYear(), submissionDate.getMonth() + 1, 0, 23, 59, 59, 999);

            const existingExpenses = await prisma.expense.aggregate({
                where: {
                    employeeId: finalEmployeeId,
                    status: { not: 'Rejected' },
                    claimDate: {
                        gte: startOfMonth,
                        lte: endOfMonth
                    }
                },
                _sum: { totalAmount: true }
            });

            const currentMonthTotal = existingExpenses._sum.totalAmount || 0;
            const limit = employee.expenseLimit || 0;

            if ((currentMonthTotal + totalAmount) > limit) {
                const monthName = submissionDate.toLocaleString('default', { month: 'long', year: 'numeric' });
                const remaining = Math.max(0, limit - currentMonthTotal);

                // No limit configured yet — tell the user to ask their admin and skip
                // the "exceeded" email (a ₹0 breach alert would be confusing).
                if (limit <= 0) {
                    return res.status(403).json({
                        error: 'No Expense Limit Set',
                        message: 'You do not have an expense limit yet. Please ask your admin to set your monthly expense limit before submitting claims.'
                    });
                }

                // Send alert email to employee
                try {
                    const org = employee.organizationId
                        ? await prisma.organization.findUnique({ where: { id: employee.organizationId } })
                        : null;

                    // Fetch admins to notify them of the limit breach
                    const admins = await prisma.employee.findMany({
                        where: { organizationId: employee.organizationId, role: 'admin' },
                        select: { email: true }
                    });
                    const adminEmails = admins.map(a => a.email).filter(Boolean);

                    await sendExpenseLimitExceededEmail(
                        employee.email,
                        employee.name,
                        totalAmount,
                        limit,
                        monthName,
                        org,
                        adminEmails
                    );
                } catch (emailErr) {
                    console.error('Failed to send limit alert email:', emailErr);
                }

                return res.status(403).json({
                    error: 'Monthly Expense Limit Exceeded',
                    message: `Your remaining expense limit for ${monthName} is ₹${remaining.toLocaleString()}. This claim of ₹${totalAmount.toLocaleString()} would exceed your monthly limit of ₹${limit.toLocaleString()}.`
                });
            }
        }

        // Build line items, pushing each item's receipt image (if any) to MinIO
        // and keeping only its URL. Receipts are now per-item, for any payment mode.
        const orgFolder = `expense-receipts/org-${employee?.organizationId ?? 'none'}`;
        const itemsData = await Promise.all(rows.map(async (row) => ({
            type: row.type,
            from: row.from || null,
            to: row.to || null,
            via: row.via || null,
            description: row.description || null,
            price: parseFloat(row.price) || 0,
            paymentMode: row.paymentMode || null,
            receipt: row.receipt ? await persistDataUrl(row.receipt, { folder: orgFolder, docType: 'receipt' }) : null,
        })));

        // Multi-level approval: route to the claimant's direct manager first
        // (or the admin pool when no manager resolves).
        const { currentApproverId, approver } = employee
            ? await computeInitialApprover(employee, prisma)
            : { currentApproverId: null, approver: null };

        const expenseData = {
            claimDate: new Date(date),
            employeeId: finalEmployeeId,
            totalAmount: totalAmount,
            status: 'Pending',
            currentApproverId,
            approvalHistory: [],
            items: { create: itemsData }
        };

        const expense = await prisma.expense.create({
            data: expenseData,
            include: {
                items: true,
                employee: { select: { name: true } }
            }
        });

        // ---------------------------------------------------------
        // BACKGROUND DISPATCH — notify the first approver only.
        // ---------------------------------------------------------
        if (employee?.organizationId) {
            (async () => {
                try {
                    const orgForEmail = await prisma.organization.findUnique({
                        where: { id: employee.organizationId },
                        select: { id: true, name: true, logo: true, admin: true }
                    }).catch(() => null);
                    await notifyInitial({
                        kind: 'expense',
                        requesterName: employee.name || 'An employee',
                        summary: buildSummary('expense', expense),
                        approver,
                        organizationId: employee.organizationId,
                        org: orgForEmail,
                        prisma,
                    });
                } catch (bgErr) {
                    console.error('Background expense notification error:', bgErr);
                }
            })();
        }

        console.log('Successfully created expense:', expense.id);
        res.status(201).json(expense);
    } catch (error) {
        console.error('Error creating expense:', error);
        res.status(500).json({
            error: 'Failed to create expense claim',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}

export async function GET(req, res) {
    // Strict organization isolation
    let orgId = null;
    if (req.user && req.user.role !== 'super-admin') {
        if (!req.user.organizationId) {
            return res.status(401).json({ error: 'Unauthorized: No organization associated with your account' });
        }
        orgId = parseInt(req.user.organizationId);
    }

    try {
        const { employeeId } = req.query;

        const where = employeeId ? { employeeId: parseInt(employeeId) } : {};
        if (orgId) {
            where.employee = { organizationId: orgId };
        }

        const expenses = await prisma.expense.findMany({
            where,
            include: {
                items: true,
                employee: {
                    select: {
                        name: true,
                        photo: true,
                        role: true,
                        department: true
                    }
                }
            },
            orderBy: {
                claimDate: 'desc'
            }
        });

        res.json(expenses);
    } catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ error: 'Failed to fetch expenses', details: error.message });
    }
}
