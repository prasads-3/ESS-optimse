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
            leaves: {
                some: {} // Only employees with at least one leave
            }
        };

        if (orgId) {
            whereClause.organizationId = orgId;
        }

        const employees = await prisma.employee.findMany({
            where: whereClause,
            include: {
                leaves: {
                    orderBy: {
                        startDate: 'desc'
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });

        res.json(employees);
    } catch (error) {
        console.error('Error fetching grouped leaves:', error);
        res.status(500).json({
            error: 'Failed to fetch grouped leaves',
            details: error.message
        });
    }
}
