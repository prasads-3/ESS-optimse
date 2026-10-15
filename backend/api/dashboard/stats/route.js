import prisma from '../../../lib/prisma.js';

// Lightweight endpoint for the subscription page: only the organization
// details + workforce count, run as two parallel queries. Avoids the ~13
// sequential queries in GET (leave analytics, announcements, trends, etc.)
// that the subscription page never displays.
export async function SUBSCRIPTION_USAGE(req, res) {
    try {
        let orgId = null;
        if (req.user && req.user.role !== 'super-admin') {
            if (!req.user.organizationId) {
                return res.status(401).json({ error: 'Unauthorized: No organization associated with your account' });
            }
            orgId = parseInt(req.user.organizationId);
        }

        const whereOrg = orgId ? { organizationId: orgId } : {};

        const [organization, totalEmployees] = await Promise.all([
            orgId
                ? prisma.organization.findUnique({
                    where: { id: orgId },
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        industry: true,
                        limit: true,
                        used: true,
                        subscriptionPlan: {
                            select: { userLimit: true, name: true }
                        }
                    }
                })
                : Promise.resolve(null),
            prisma.employee.count({
                where: { ...whereOrg, role: { not: 'admin' } }
            })
        ]);

        res.json({ organization, totalEmployees });
    } catch (error) {
        console.error('Error fetching subscription usage:', error);
        res.status(500).json({ error: 'Failed to fetch subscription usage', details: error.message });
    }
}

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

        const whereOrg = orgId ? { organizationId: orgId } : {};
        const whereEmployeeOrg = orgId ? { employee: { organizationId: orgId } } : {};

        let organizationDetails = null;
        if (orgId) {
            organizationDetails = await prisma.organization.findUnique({
                where: { id: orgId },
                select: { 
                    name: true, 
                    address: true, 
                    industry: true, 
                    limit: true, 
                    used: true,
                    subscriptionPlan: {
                        select: { userLimit: true, name: true }
                    }
                }
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Total Workforce (Exclude Admins)
        const totalEmployees = await prisma.employee.count({
            where: { 
                ...whereOrg,
                role: { not: 'admin' } 
            }
        });

        // 1b. Total Policies
        const totalPolicies = await prisma.policy.count({
            where: { ...whereOrg }
        });

        // 2. Active Status = distinct employees (excluding admins) who have logged
        // in at least once TODAY. Based on real login activity (LoginLog), not the
        // stored employment status. `today` is midnight (set above).
        const activeLoginRows = await prisma.loginLog.findMany({
            where: {
                loginTime: { gte: today },
                userId: { not: null },
                employee: { ...whereOrg, role: { not: 'admin' } }
            },
            distinct: ['userId'],
            select: { userId: true }
        });
        const activeEmployees = activeLoginRows.length;

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // 3. On Leave (Approved leaves active today)
        const onLeave = await prisma.leave.count({
            where: {
                ...whereEmployeeOrg,
                status: 'Approved',
                startDate: { lte: todayEnd },
                endDate: { gte: todayStart }
            }
        });

        // 4. Pending Requests
        const totalPendingLeaves = await prisma.leave.count({
            where: { 
                ...whereEmployeeOrg,
                status: 'Pending' 
            }
        });

        const pendingLeavesList = await prisma.leave.findMany({
            where: { 
                ...whereEmployeeOrg,
                status: 'Pending' 
            },
            include: {
                employee: {
                    select: { id: true, name: true, photo: true }
                }
            },
            take: 5,
            orderBy: { createdAt: 'desc' }
        });

        // 5. Recent Activities
        const recentEmployees = await prisma.employee.findMany({
            where: { 
                ...whereOrg,
                role: { not: 'admin' } 
            },
            take: 3,
            orderBy: { createdAt: 'desc' },
            select: { name: true, createdAt: true }
        });

        const recentAnnouncements = await prisma.announcement.findMany({
            where: { ...whereOrg },
            take: 3,
            orderBy: { createdAt: 'desc' },
            select: { title: true, createdAt: true }
        });

        const activities = [
            ...recentEmployees.map(e => ({ type: 'employee', target: e.name, time: e.createdAt, action: 'added' })),
            ...recentAnnouncements.map(a => ({ type: 'announcement', target: a.title, time: a.createdAt, action: 'posted' }))
        ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);

        // 6. Leave Analytics
        const leavesForAnalytics = await prisma.leave.findMany({
            where: {
                ...whereEmployeeOrg,
                status: 'Approved',
                createdAt: { gte: new Date(new Date().setMonth(new Date().getMonth() - 10)) }
            },
            select: { createdAt: true }
        });
        
        const leaveAnalytics = [];
        const now = new Date();
        
        for (let i = 9; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });
            
            const count = leavesForAnalytics.filter(l => {
                const lDate = new Date(l.createdAt);
                return lDate.getMonth() === d.getMonth() && lDate.getFullYear() === d.getFullYear();
            }).length;

            leaveAnalytics.push({
                month: monthLabel,
                count: count
            });
        }
        
        // 7. Trends
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const newEmployeesLast30Days = await prisma.employee.count({
            where: { 
                ...whereOrg,
                createdAt: { gte: thirtyDaysAgo } 
            }
        });

        const newActiveLast30Days = await prisma.employee.count({
            where: {
                ...whereOrg,
                status: { in: ['Active', 'active'] },
                createdAt: { gte: thirtyDaysAgo }
            }
        });

        const newLeavesLast7Days = await prisma.leave.count({
            where: {
                ...whereEmployeeOrg,
                status: 'Approved',
                createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            }
        });

        res.json({
            totalEmployees,
            totalPolicies,
            activeEmployees,
            onLeave,
            pendingLeaves: totalPendingLeaves,
            pendingLeavesList,
            activities,
            leaveAnalytics,
            organization: organizationDetails,
            trend: {
                total: `+${newEmployeesLast30Days}`,
                active: `+${newActiveLast30Days}`,
                leave: newLeavesLast7Days > 0 ? `+${newLeavesLast7Days}` : "0",
                totalType: 'up',
                activeType: 'up',
                leaveType: newLeavesLast7Days > 0 ? 'up' : 'down'
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            error: 'Failed to fetch dashboard statistics',
            details: error.message,
            stack: error.stack
        });
    }
}

// Currently-online employees for the dashboard widget. "Online" = an open login
// session (LoginLog.logoutTime IS NULL) started within the JWT lifetime (24h),
// one row per employee (latest session). Status is derived from recency of the
// last signal (latest tracking ping or the login itself): "active" if seen within
// IDLE_MINUTES, otherwise "idle". All values come from the DB — nothing hardcoded.
export async function ONLINE_EMPLOYEES(req, res) {
    try {
        let orgId = null;
        if (req.user && req.user.role !== 'super-admin') {
            if (!req.user.organizationId) {
                return res.status(401).json({ error: 'Unauthorized: No organization associated with your account' });
            }
            orgId = parseInt(req.user.organizationId);
        }

        // Daily scope: only sessions started TODAY count, so the list resets at
        // midnight (yesterday's lingering open sessions drop off the new day).
        const since = new Date();
        since.setHours(0, 0, 0, 0);

        // Open sessions started today, newest first, with the employee joined.
        const sessions = await prisma.loginLog.findMany({
            where: {
                logoutTime: null,
                loginTime: { gte: since },
                userId: { not: null },
                employee: { ...(orgId ? { organizationId: orgId } : {}), role: { not: 'admin' } }
            },
            orderBy: { loginTime: 'desc' },
            select: {
                userId: true, loginTime: true, loginCity: true, loginArea: true,
                deviceType: true, deviceInfo: true,
                employee: { select: { id: true, name: true, title: true, department: true, role: true, photo: true, location: true } }
            }
        });

        // One row per employee — keep the most recent open session.
        const latestByEmployee = new Map();
        for (const s of sessions) {
            if (!latestByEmployee.has(s.userId)) latestByEmployee.set(s.userId, s);
        }
        const online = [...latestByEmployee.values()];

        // Last activity per online employee: latest tracking ping (if any).
        const empIds = online.map((s) => s.userId);
        const lastSeenByEmployee = new Map();
        if (empIds.length) {
            const tracks = await prisma.trackingLog.groupBy({
                by: ['employeeId'],
                where: { employeeId: { in: empIds } },
                _max: { timestamp: true }
            });
            tracks.forEach((t) => lastSeenByEmployee.set(t.employeeId, t._max.timestamp));
        }

        const employees = online.map((s) => {
            const e = s.employee || {};
            const trackTs = lastSeenByEmployee.get(s.userId);
            // lastSeen is the freshest known signal (latest tracking ping or login).
            const lastSeen = trackTs && new Date(trackTs) > new Date(s.loginTime) ? trackTs : s.loginTime;
            const location = [s.loginArea, s.loginCity].filter(Boolean).join(', ') || e.location || null;
            // Anyone with an open session today is "active". (No idle heuristic —
            // there's no activity heartbeat, so a stale timestamp shouldn't flip a
            // present, logged-in user to "idle".)
            return {
                id: e.id ?? s.userId,
                name: e.name ?? 'Unknown',
                designation: e.title || e.department || e.role || null,
                avatar: e.photo || null,
                loginTime: s.loginTime,
                lastSeen,
                location,
                device: s.deviceType || null,
                status: 'active'
            };
        });

        res.json({ totalOnline: employees.length, employees });
    } catch (error) {
        console.error('Error fetching online employees:', error);
        res.status(500).json({ error: 'Failed to fetch online employees', details: error.message });
    }
}

// Minutes of inactivity after which a logged-in employee is considered "idle".
const IDLE_MINUTES = 5;

// Per-employee status board for the KPI modal. Classifies every (non-admin)
// employee in the org into one of three buckets, derived purely from real
// login/logout + activity data:
//   active   — has an open session today AND was seen within IDLE_MINUTES
//   idle     — has an open session today but last activity is older than that
//   inactive — no open session today (logged out, or never logged in today)
// "Last seen" is the freshest of the latest tracking ping or the login time.
export async function EMPLOYEE_STATUS(req, res) {
    try {
        let orgId = null;
        if (req.user && req.user.role !== 'super-admin') {
            if (!req.user.organizationId) {
                return res.status(401).json({ error: 'Unauthorized: No organization associated with your account' });
            }
            orgId = parseInt(req.user.organizationId);
        }
        const whereOrg = orgId ? { organizationId: orgId } : {};

        const since = new Date();
        since.setHours(0, 0, 0, 0);
        const idleCutoff = new Date(Date.now() - IDLE_MINUTES * 60 * 1000);

        // Every non-admin employee in the org (the full roster we classify).
        const roster = await prisma.employee.findMany({
            where: { ...whereOrg, role: { not: 'admin' } },
            select: { id: true, name: true, title: true, department: true, role: true, photo: true, location: true },
            orderBy: { name: 'asc' }
        });

        // Open sessions started today, newest first — one (latest) per employee.
        const sessions = await prisma.loginLog.findMany({
            where: {
                logoutTime: null,
                loginTime: { gte: since },
                userId: { not: null },
                employee: { ...whereOrg, role: { not: 'admin' } }
            },
            orderBy: { loginTime: 'desc' },
            select: { userId: true, loginTime: true, loginCity: true, loginArea: true, deviceType: true }
        });
        const sessionByEmployee = new Map();
        for (const s of sessions) {
            if (!sessionByEmployee.has(s.userId)) sessionByEmployee.set(s.userId, s);
        }

        // Latest activity ping for the online employees.
        const onlineIds = [...sessionByEmployee.keys()];
        const lastPingByEmployee = new Map();
        if (onlineIds.length) {
            const tracks = await prisma.trackingLog.groupBy({
                by: ['employeeId'],
                where: { employeeId: { in: onlineIds } },
                _max: { timestamp: true }
            });
            tracks.forEach((t) => lastPingByEmployee.set(t.employeeId, t._max.timestamp));
        }

        const counts = { active: 0, idle: 0, inactive: 0, total: roster.length };

        const employees = roster.map((e) => {
            const s = sessionByEmployee.get(e.id);
            let status, loginTime = null, lastSeen = null, location = e.location || null, device = null;

            if (!s) {
                // No open session today → inactive.
                status = 'inactive';
            } else {
                loginTime = s.loginTime;
                device = s.deviceType || null;
                location = [s.loginArea, s.loginCity].filter(Boolean).join(', ') || e.location || null;
                const ping = lastPingByEmployee.get(e.id);
                lastSeen = ping && new Date(ping) > new Date(s.loginTime) ? ping : s.loginTime;
                // Idle once the last signal is older than the cutoff.
                status = new Date(lastSeen) >= idleCutoff ? 'active' : 'idle';
            }

            counts[status] += 1;
            return {
                id: e.id,
                name: e.name,
                designation: e.title || e.department || e.role || null,
                avatar: e.photo || null,
                loginTime,
                lastSeen,
                location,
                device,
                status
            };
        });

        res.json({ counts, employees });
    } catch (error) {
        console.error('Error fetching employee status:', error);
        res.status(500).json({ error: 'Failed to fetch employee status', details: error.message });
    }
}

// Activity heartbeat. The frontend pings this while the logged-in user is active
// (interacting + tab visible). It refreshes the employee's "last seen" so the
// status board keeps them Active; once the pings stop for IDLE_MINUTES (user
// walked away / closed the tab) they fall back to Idle. To avoid bloating
// TrackingLog, we keep a single HEARTBEAT row per employee and just bump its
// timestamp.
export async function HEARTBEAT(req, res) {
    try {
        const employeeId = Number(req.user?.id);
        // Only real employees/admins have a TrackingLog FK target.
        if (!employeeId || req.user?.role === 'super-admin') {
            return res.json({ ok: true, skipped: true });
        }
        const now = new Date();
        const updated = await prisma.trackingLog.updateMany({
            where: { employeeId, action: 'HEARTBEAT' },
            data: { timestamp: now }
        });
        if (updated.count === 0) {
            await prisma.trackingLog.create({
                data: { employeeId, action: 'HEARTBEAT', timestamp: now }
            });
        }
        res.json({ ok: true });
    } catch (error) {
        console.error('Error recording heartbeat:', error);
        res.status(500).json({ error: 'Failed to record heartbeat' });
    }
}
