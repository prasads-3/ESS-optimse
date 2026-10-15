import prisma from '../../../lib/prisma.js';
import { advanceApproval, canActOn, buildSummary } from '../../../lib/approval.js';

// GET /api/admin/money-requests — returns all money requests for the admin's org
export async function GET(req, res) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
    }
    const orgId = req.user.organizationId;
    console.log(`[Admin Money Requests] Fetching for Org ID: ${orgId}, User Role: ${req.user.role}`);
    
    if (!orgId) return res.status(400).json({ error: 'No organization found' });

    try {
        const requests = await prisma.moneyRequest.findMany({
            where: { 
                OR: [
                    { organizationId: parseInt(orgId) },
                    { employee: { organizationId: parseInt(orgId) } }
                ]
            },
            include: {
                employee: {
                    select: { id: true, name: true, email: true, photo: true, department: true, title: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return res.json(requests);
    } catch (err) {
        console.error('[Money Requests GET Error]', err);
        return res.status(500).json({ error: 'Failed to fetch money requests' });
    }
}

// PATCH /api/admin/money-requests/:id — act on a request in the approval chain.
// Usable by the current approver (a manager) as well as an admin at the final
// stage; permission is enforced per-request by canActOn (not a blanket role gate).
export async function PATCH(req, res) {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    const { id } = req.params;
    const { status, adminNote } = req.body;

    // Fund requests use "Disabled" for a declined request; also accept "Rejected".
    if (!['Approved', 'Disabled', 'Rejected'].includes(status)) {
        return res.status(400).json({ error: 'Status must be Approved or Disabled' });
    }
    const action = status === 'Approved' ? 'approve' : 'reject';

    try {
        const existing = await prisma.moneyRequest.findUnique({
            where: { id: parseInt(id) },
            include: {
                employee: { select: { id: true, name: true, email: true, personalEmail: true, reportsTo: true, reportsToName: true, organizationId: true } }
            }
        });
        if (!existing) return res.status(404).json({ error: 'Money request not found' });

        // Org isolation.
        const reqOrg = existing.organizationId ?? existing.employee?.organizationId;
        if (req.user.role !== 'super-admin' && Number(reqOrg) !== Number(req.user.organizationId)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (!canActOn(existing, req.user)) {
            return res.status(403).json({ error: 'You are not authorized to action this request at its current stage.' });
        }

        const actorName = (await prisma.employee.findUnique({ where: { id: Number(req.user.id) }, select: { name: true } }).catch(() => null))?.name || req.user.email;
        const org = reqOrg
            ? await prisma.organization.findUnique({ where: { id: Number(reqOrg) }, select: { id: true, name: true, logo: true, admin: true } }).catch(() => null)
            : null;

        const outcome = await advanceApproval({
            kind: 'fund',
            request: existing,
            requester: existing.employee,
            actor: { id: Number(req.user.id), name: actorName, role: req.user.role },
            action,
            note: adminNote,
            summary: buildSummary('fund', existing),
            org,
            prisma,
        });

        const updated = await prisma.moneyRequest.update({
            where: { id: parseInt(id) },
            data: { ...outcome.data, adminNote: adminNote || existing.adminNote || null, updatedAt: new Date() },
            include: {
                employee: { select: { name: true, email: true, personalEmail: true, organizationId: true } }
            }
        });

        // Email the employee only once finalized.
        if (outcome.finalized) {
            (async () => {
                try {
                    const { sendMoneyRequestStatusEmail } = await import('../../../lib/email.js');
                    await sendMoneyRequestStatusEmail({
                        employeeEmail: updated.employee.email,
                        personalEmail: updated.employee.personalEmail,
                        employeeName: updated.employee.name,
                        amount: updated.amount,
                        status: updated.status,
                        reason: updated.reason,
                        adminNote: updated.adminNote,
                        org
                    });
                    console.log(`[Email] Status update sent to ${updated.employee.email} (${updated.status})`);
                } catch (emailErr) {
                    console.error('[Email Error] Failed to send status update:', emailErr);
                }
            })();
        }

        return res.json(updated);
    } catch (err) {
        console.error('[Money Requests PATCH Error]', err);
        return res.status(500).json({ error: 'Failed to update money request' });
    }
}
