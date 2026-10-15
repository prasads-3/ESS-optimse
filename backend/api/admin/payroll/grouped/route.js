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
            salarySlips: {
                some: {} // Only employees with at least one record
            }
        };

        if (orgId) {
            whereClause.organizationId = orgId;
        }

        const employees = await prisma.employee.findMany({
            where: whereClause,
            include: {
                salarySlips: {
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });

        res.json(employees);
    } catch (error) {
        console.error('Error fetching grouped payroll:', error);
        res.status(500).json({
            error: 'Failed to fetch grouped payroll',
            details: error.message
        });
    }
}
