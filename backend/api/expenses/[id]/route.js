import prisma from '../../../lib/prisma.js';
import { sendExpenseStatusEmail } from '../../../lib/email.js';
import { checkSameOrg } from '../../../lib/tenant.js';
import { advanceApproval, canActOn, buildSummary } from '../../../lib/approval.js';
import { persistDataUrl, removeObjectByUrl } from '../../../lib/minio.js';

export async function PATCH(req, res) {
    try {
        const { id } = req.params;
        const { status, note } = req.body;

        if (!['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ error: 'Status must be Approved or Rejected' });
        }
        const action = status === 'Approved' ? 'approve' : 'reject';

        const existing = await prisma.expense.findUnique({
            where: { id: parseInt(id) },
            include: {
                employee: { select: { id: true, name: true, email: true, personalEmail: true, reportsTo: true, reportsToName: true, organizationId: true } }
            }
        });
        if (!existing) return res.status(404).json({ error: 'Expense not found' });
        if (!checkSameOrg(req, res, existing, { via: 'employee' })) return;

        if (!canActOn(existing, req.user)) {
            return res.status(403).json({ error: 'You are not authorized to action this request at its current stage.' });
        }

        const actorName = (await prisma.employee.findUnique({ where: { id: Number(req.user.id) }, select: { name: true } }).catch(() => null))?.name || req.user.email;
        const org = existing.employee?.organizationId
            ? await prisma.organization.findUnique({ where: { id: existing.employee.organizationId }, select: { id: true, name: true, logo: true, admin: true } }).catch(() => null)
            : null;

        const outcome = await advanceApproval({
            kind: 'expense',
            request: existing,
            requester: existing.employee,
            actor: { id: Number(req.user.id), name: actorName, role: req.user.role },
            action,
            note,
            summary: buildSummary('expense', existing),
            org,
            prisma,
        });

        const expense = await prisma.expense.update({
            where: { id: parseInt(id) },
            data: outcome.data,
            include: { employee: { select: { email: true, personalEmail: true, organizationId: true } } }
        });

        if (outcome.finalized) {
            (async () => {
                if (expense.employee?.email) {
                    try {
                        await sendExpenseStatusEmail(
                            expense.employee.email,
                            outcome.decision,
                            expense.totalAmount,
                            expense.claimDate,
                            org,
                            expense.employee.personalEmail
                        );
                    } catch (emailError) {
                        console.error(`Background expense status notification error for ${expense.employee.email}:`, emailError);
                    }
                }
            })();
        }

        res.json(expense);
    } catch (error) {
        console.error('Error updating expense:', error);
        res.status(500).json({ error: 'Failed to update expense', details: error.message });
    }
}

// PUT /api/expenses/:id — edit a submitted claim (date + line items).
// Only the claim owner (or an admin) may edit, and only while it is still
// Pending; approved/rejected claims are immutable.
export async function PUT(req, res) {
    try {
        const { id } = req.params;
        const expenseId = parseInt(id);
        const { date, rows } = req.body;

        if (!date || !Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ error: 'Missing or invalid required fields' });
        }

        const existing = await prisma.expense.findUnique({
            where: { id: expenseId },
            include: {
                employee: { select: { organizationId: true, expenseLimit: true } },
                items: { select: { receipt: true } }
            }
        });
        if (!existing) return res.status(404).json({ error: 'Expense not found' });
        if (!checkSameOrg(req, res, existing, { via: 'employee' })) return;

        const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super-admin';
        if (!isAdmin && parseInt(req.user?.id) !== existing.employeeId) {
            return res.status(403).json({ error: 'You can only edit your own expense claims' });
        }
        if (existing.status !== 'Pending') {
            return res.status(400).json({ error: `Only pending claims can be edited (current status: ${existing.status})` });
        }

        const totalAmount = rows.reduce((acc, row) => {
            const price = parseFloat(row.price);
            return acc + (isNaN(price) ? 0 : price);
        }, 0);

        // Re-check the monthly limit (same rule as POST), excluding this claim's
        // own current amount. A 0 limit means no allowance — claims are blocked
        // until an admin sets one (no "0 = unlimited" rule).
        const limit = existing.employee?.expenseLimit || 0;
        {
            const d = new Date(date);
            const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
            const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
            const agg = await prisma.expense.aggregate({
                where: {
                    employeeId: existing.employeeId,
                    id: { not: expenseId },
                    status: { not: 'Rejected' },
                    claimDate: { gte: startOfMonth, lte: endOfMonth }
                },
                _sum: { totalAmount: true }
            });
            const otherTotal = agg._sum.totalAmount || 0;
            if (otherTotal + totalAmount > limit) {
                if (limit <= 0) {
                    return res.status(403).json({
                        error: 'No Expense Limit Set',
                        message: 'You do not have an expense limit yet. Please ask your admin to set your monthly expense limit before submitting claims.'
                    });
                }
                const monthName = d.toLocaleString('default', { month: 'long', year: 'numeric' });
                const remaining = Math.max(0, limit - otherTotal);
                return res.status(403).json({
                    error: 'Monthly Expense Limit Exceeded',
                    message: `Your remaining expense limit for ${monthName} is ₹${remaining.toLocaleString()}. This claim of ₹${totalAmount.toLocaleString()} would exceed your monthly limit of ₹${limit.toLocaleString()}.`
                });
            }
        }

        // Build line items, pushing each item's receipt (if a new base64 upload)
        // to MinIO; values that are already URLs pass through unchanged.
        const orgFolder = `expense-receipts/org-${existing.employee?.organizationId ?? 'none'}`;
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

        // Replace line items and update the claim atomically.
        const [, updated] = await prisma.$transaction([
            prisma.expenseItem.deleteMany({ where: { expenseId } }),
            prisma.expense.update({
                where: { id: expenseId },
                data: {
                    claimDate: new Date(date),
                    totalAmount,
                    items: { create: itemsData }
                },
                include: { items: true }
            })
        ]);

        // Clean up storage: any old receipt URL no longer referenced by the new
        // items was removed/replaced in the edit — delete its MinIO object.
        // Best-effort and fire-and-forget; removeObjectByUrl never throws.
        const keptReceipts = new Set(itemsData.map((i) => i.receipt).filter(Boolean));
        (existing.items || [])
            .map((i) => i.receipt)
            .filter((url) => url && !keptReceipts.has(url))
            .forEach((url) => removeObjectByUrl(url));

        res.json(updated);
    } catch (error) {
        console.error('Error editing expense:', error);
        res.status(500).json({ error: 'Failed to update expense claim', details: error.message });
    }
}

export async function DELETE(req, res) {
    try {
        const { id } = req.params;
        const expenseId = parseInt(id);

        // Verify existence
        const existing = await prisma.expense.findUnique({
            where: { id: expenseId },
            include: {
                employee: { select: { organizationId: true } },
                items: { select: { receipt: true } }
            }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        if (!checkSameOrg(req, res, existing, { via: 'employee' })) return;

        // First delete items related to the expense (due to FK constraints if any, though Cascade is often used)
        await prisma.expenseItem.deleteMany({
            where: { expenseId }
        });

        const expense = await prisma.expense.delete({
            where: { id: expenseId }
        });

        // Clean up storage: drop the deleted claim's receipt objects from MinIO.
        // Best-effort and fire-and-forget; removeObjectByUrl never throws.
        (existing.items || [])
            .map((i) => i.receipt)
            .filter(Boolean)
            .forEach((url) => removeObjectByUrl(url));

        res.json({ message: 'Expense deleted successfully', expense });
    } catch (error) {
        console.error('Error deleting expense:', error);
        res.status(500).json({ error: 'Failed to delete expense', details: error.message });
    }
}
