import prisma from '../../lib/prisma.js';

// GET /api/approvals — requests across leave / expense / fund that are currently
// awaiting the logged-in user's decision in the approval chain.
//
// A request is "awaiting me" when it is Pending and either:
//   - currentApproverId === me (I'm the assigned manager/admin in the chain), or
//   - currentApproverId is null AND I'm an admin (the admin-pool final stage).
// Never includes the user's own requests.
export async function GET(req, res) {
    try {
        const userId = Number(req.user?.id);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const orgId = req.user.role !== 'super-admin' ? Number(req.user.organizationId) : null;
        if (req.user.role !== 'super-admin' && !orgId) {
            return res.status(401).json({ error: 'Unauthorized: No organization associated with your account' });
        }

        // Who-can-act condition: assigned to me, or admin-pool when I'm an admin.
        const approverWhere = req.user.role === 'admin'
            ? { OR: [{ currentApproverId: userId }, { currentApproverId: null }] }
            : { currentApproverId: userId };

        const empOrg = orgId ? { employee: { organizationId: orgId } } : {};

        const [leaves, expenses, funds] = await Promise.all([
            prisma.leave.findMany({
                where: { status: 'Pending', employeeId: { not: userId }, ...approverWhere, ...empOrg },
                include: { employee: { select: { id: true, name: true, photo: true, department: true } } },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.expense.findMany({
                where: { status: 'Pending', employeeId: { not: userId }, ...approverWhere, ...empOrg },
                include: { items: true, employee: { select: { id: true, name: true, photo: true, department: true } } },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.moneyRequest.findMany({
                where: { status: 'Pending', employeeId: { not: userId }, ...approverWhere, ...empOrg },
                include: { employee: { select: { id: true, name: true, photo: true, department: true } } },
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        const isAdminPool = (r) => r.currentApproverId == null;

        const items = [
            ...leaves.map((l) => ({
                kind: 'leave',
                id: l.id,
                requester: l.employee,
                title: `${l.type || 'Leave'}`,
                detail: `${new Date(l.startDate).toLocaleDateString('en-GB')} – ${new Date(l.endDate).toLocaleDateString('en-GB')}${l.isHalfDay ? ' (half day)' : ''}`,
                reason: l.reason || null,
                amount: null,
                createdAt: l.createdAt,
                finalStage: isAdminPool(l),
                approvalHistory: l.approvalHistory || [],
            })),
            ...expenses.map((e) => ({
                kind: 'expense',
                id: e.id,
                requester: e.employee,
                title: 'Expense claim',
                detail: `${(e.items || []).length} item(s)`,
                reason: null,
                amount: e.totalAmount,
                createdAt: e.createdAt,
                finalStage: isAdminPool(e),
                approvalHistory: e.approvalHistory || [],
            })),
            ...funds.map((f) => ({
                kind: 'fund',
                id: f.id,
                requester: f.employee,
                title: 'Fund request',
                detail: f.urgency ? `${f.urgency} urgency` : '',
                reason: f.reason || null,
                amount: f.amount,
                createdAt: f.createdAt,
                finalStage: isAdminPool(f),
                approvalHistory: f.approvalHistory || [],
            })),
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json(items);
    } catch (error) {
        console.error('[Approvals GET Error]', error);
        res.status(500).json({ error: 'Failed to fetch approvals', details: error.message });
    }
}
