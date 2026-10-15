import prisma from '../../lib/prisma.js';
import { checkFeature } from '../../lib/feature-gate.js';

export async function GET(req, res) {
    // Feature Gating
    const access = await checkFeature(req, 'tracking');
    if (!access.allowed) {
        return res.status(403).json({ error: 'Feature Restricted', message: access.reason });
    }

    // Strict organization isolation
    let orgId = null;
    if (req.user && req.user.role !== 'super-admin') {
        if (!req.user.organizationId) {
            return res.status(401).json({ error: 'Unauthorized: No organization associated with your account' });
        }
        orgId = parseInt(req.user.organizationId);
    }

    try {
        const whereClause = orgId ? { employee: { organizationId: orgId } } : {};
        const logs = await prisma.loginLog.findMany({
            where: whereClause,
            orderBy: {
                loginTime: 'desc'
            },
            include: {
                employee: {
                    select: {
                        name: true,
                        employeeId: true,
                        role: true,
                        // locationHistory intentionally omitted: it is a large JSON
                        // field that was being read for every row but never sent to
                        // the client (it isn't part of formattedLogs below).
                        organizationId: true
                    }
                }
            },
            take: 100 // Limit for performance
        });

        const formattedLogs = logs.map(log => {
            const formatLoc = (lat, lon, city, area) => {
                if (lat !== null && lon !== null) {
                    const coords = `Lat: ${lat.toFixed(4)}, Long: ${lon.toFixed(4)}`;
                    if (city || area) {
                        return `${city || ''}${area ? ', ' + area : ''} (${coords})`;
                    }
                    return coords;
                }
                return "Not shared";
            };

            const formatDate = (date) => date 
                ? new Date(date).toLocaleString('en-IN', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                }) 
                : "Active";

            return {
                id: log.id,
                employee: log.employee?.name || log.email || 'System Admin',
                employeeId: log.employee?.employeeId || (log.employee?.role === 'admin' ? 'ADMIN' : 'N/A'),
                loginTime: formatDate(log.loginTime),
                logoutTime: log.logoutTime ? formatDate(log.logoutTime) : "Currently Logged In",
                loginLocation: formatLoc(log.loginLat, log.loginLong, log.loginCity, log.loginArea),
                logoutLocation: formatLoc(log.logoutLat, log.logoutLong, log.logoutCity, log.logoutArea),
                device: log.deviceType,
                deviceDetails: log.deviceInfo,
                ip: log.ipAddress,
                // Raw coordinates for Map Component
                loginLat: log.loginLat,
                loginLong: log.loginLong,
                logoutLat: log.logoutLat,
                logoutLong: log.logoutLong,
                status: log.logoutTime ? "LOGOUT" : "LOGIN"
            }
        });

        res.json(formattedLogs);
    } catch (error) {
        console.error('Tracking fetch error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
