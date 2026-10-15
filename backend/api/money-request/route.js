import prisma from '../../lib/prisma.js';
import { computeInitialApprover, notifyInitial, buildSummary } from '../../lib/approval.js';

// GET /api/money-request — returns the logged-in employee's own requests
export async function GET(req, res) {
    try {
        const employeeId = parseInt(req.user?.id);
        if (isNaN(employeeId)) return res.status(401).json({ error: 'Unauthorized' });

        const requests = await prisma.moneyRequest.findMany({
            where: { employeeId },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(requests);
    } catch (error) {
        console.error('[Money Request GET Error]', error);
        res.status(500).json({ error: 'Failed to fetch your requests' });
    }
}

export async function POST(req, res) {
    try {
        const { reason, amount, description, urgency } = req.body;
        const employeeId = parseInt(req.user?.id);

        if (!reason || !amount || isNaN(employeeId)) {
            return res.status(400).json({ error: 'Missing required fields: reason and amount are required.' });
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ error: 'Amount must be a valid positive number.' });
        }

        // Fetch employee with org in a single query
        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
            select: {
                id: true,
                name: true,
                email: true,
                organizationId: true,
                reportsTo: true,
                reportsToName: true,
                organization: {
                    select: { id: true, name: true, slug: true, logo: true, admin: true }
                }
            }
        });

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found.' });
        }

        // Multi-level approval: route to the requester's direct manager first
        // (or the admin pool when no manager resolves).
        const { currentApproverId, approver } = await computeInitialApprover(employee, prisma);

        // Save to DB
        const saved = await prisma.moneyRequest.create({
            data: {
                employeeId,
                organizationId: employee.organizationId || null,
                reason,
                amount: parsedAmount,
                description: description || null,
                urgency: urgency || 'Normal',
                status: 'Pending',
                currentApproverId,
                approvalHistory: [],
            }
        });

        // Immediately respond to the client
        res.status(200).json({
            success: true,
            id: saved.id,
            message: 'Your additional money request has been submitted and sent for approval.',
        });

        // Background dispatch — notify the first approver only.
        (async () => {
            try {
                await notifyInitial({
                    kind: 'fund',
                    requesterName: employee.name || 'An employee',
                    summary: buildSummary('fund', saved),
                    approver,
                    organizationId: employee.organizationId,
                    org: employee.organization || null,
                    prisma,
                });
                console.log(`[Money Request] Approval notification dispatched for ${employee.name} (₹${parsedAmount})`);
            } catch (bgErr) {
                console.error('[Money Request] Background notification error:', bgErr);
            }
        })();

    } catch (error) {
        console.error('[Money Request POST Error]', error);
        if (!res.headersSent) {
            return res.status(500).json({ error: 'Failed to submit money request.', details: error.message });
        }
    }
}
