import prisma from '../../../../lib/prisma.js';

export async function GET(req, res) {
    try {
        // Strict organization isolation
        let orgId = null;
        if (req.user && req.user.role !== 'super-admin') {
            if (!req.user.organizationId) {
                return res.status(401).json({ error: 'Unauthorized: No organization associated with your account' });
            }
            orgId = parseInt(req.user.organizationId);
        }

        const whereClause = {
            expenses: {
                some: {} // Only employees with at least one expense claim
            }
        };

        if (orgId) {
            whereClause.organizationId = orgId;
        }

        const employees = await prisma.employee.findMany({
            where: whereClause,
            select: {
                id: true,
                name: true,
                photo: true,
                role: true,
                expenses: {
                    select: {
                        status: true,
                        totalAmount: true,
                        claimDate: true
                    },
                    orderBy: {
                        claimDate: 'desc'
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });

        res.json(employees);
    } catch (error) {
        console.error('Error fetching grouped expenses:', error);
        res.status(500).json({
            error: 'Failed to fetch grouped expenses',
            details: error.message
        });
    }
}
