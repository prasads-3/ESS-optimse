import prisma from '../../../lib/prisma.js';

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

        const whereClause = orgId ? { employee: { organizationId: orgId } } : {};

        const logs = await prisma.loginLog.findMany({
            where: whereClause,
            orderBy: {
                loginTime: 'desc'
            },
            include: {
                employee: {
                    select: {
                        email: true,
                        name: true,
                        role: true
                    }
                }
            }
        });

        // Format response to include email even for hardcoded admin or if employee record is deleted
        const formattedLogs = logs.map(log => ({
            ...log,
            userEmail: log.employee?.email || log.email || 'Unknown',
            userName: log.employee?.name || (log.employee?.role === 'admin' ? 'System Admin' : 'Unknown')
        }));

        res.json(formattedLogs);
    } catch (error) {
        console.error('Error fetching login logs:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
