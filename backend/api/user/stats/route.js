import prisma from '../../../lib/prisma.js';
import { sumLeaveDays } from '../../../lib/leave.js';

export async function GET(req, res) {
    try {
        const { id } = req.params;
        const employeeId = parseInt(id);

        if (isNaN(employeeId)) {
            return res.status(400).json({ error: 'Invalid employee ID' });
        }

        // Strict organization isolation
        let orgId = null;
        if (req.user && req.user.role !== 'super-admin') {
            if (!req.user.organizationId) {
                return res.status(401).json({ error: 'Unauthorized: No organization associated with your account' });
            }
            orgId = parseInt(req.user.organizationId);

            // Fetch the employee to verify their organizationId
            const targetEmployee = await prisma.employee.findUnique({
                where: { id: employeeId },
                select: { organizationId: true }
            });

            if (!targetEmployee || targetEmployee.organizationId !== orgId) {
                return res.status(403).json({ error: 'Access Denied: You do not have permission to view stats for this employee' });
            }
        }

        // 1. Leave Statistics
        const currentYear = new Date().getFullYear();
        const yearStart = new Date(currentYear, 0, 1);
        const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59);

        const leaves = await prisma.leave.findMany({
            where: {
                employeeId,
                startDate: {
                    gte: yearStart,
                    lte: yearEnd
                }
            }
        });

        const ANNUAL_LEAVE_QUOTA = 24;
        const MONTHLY_LEAVE_LIMIT = 2;
        const total = ANNUAL_LEAVE_QUOTA;
        // Day-based accounting: balance is in DAYS, not request count. Only
        // Approved leave reduces the available balance — Pending is shown
        // separately and does NOT deduct until an admin approves it.
        const used = sumLeaveDays(leaves.filter(l => l.status === 'Approved'));
        const pending = sumLeaveDays(leaves.filter(l => l.status === 'Pending'));
        const available = Math.max(0, total - used);

        // Count leaves this month for monthly limit info
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const leavesThisMonth = leaves.filter(l => {
            const d = new Date(l.startDate);
            return d >= monthStart && d <= monthEnd;
        }).length;
        const monthlyRemaining = Math.max(0, MONTHLY_LEAVE_LIMIT - leavesThisMonth);

        // 2. Recent Payslips
        const recentPayslips = await prisma.salarySlip.findMany({
            where: { employeeId },
            take: 3,
            orderBy: { createdAt: 'desc' }
        });

        // 3. Recent Expenses
        const recentExpenses = await prisma.expense.findMany({
            where: { employeeId },
            take: 3,
            orderBy: { createdAt: 'desc' }
        });

        // 3b. Expense limit (admin-set, monthly) + this month's usage. A 0 limit
        // means the employee cannot claim until an admin sets one.
        const employeeRec = await prisma.employee.findUnique({
            where: { id: employeeId },
            select: { expenseLimit: true }
        });
        const expenseLimit = employeeRec?.expenseLimit || 0;
        const monthExpenseAgg = await prisma.expense.aggregate({
            where: {
                employeeId,
                status: { not: 'Rejected' },
                claimDate: { gte: monthStart, lte: monthEnd }
            },
            _sum: { totalAmount: true }
        });
        const expenseUsedThisMonth = monthExpenseAgg._sum.totalAmount || 0;

        // 4. Recent Notifications (related to this user)
        const userLeaves = await prisma.leave.findMany({
            where: { employeeId },
            take: 3,
            orderBy: { updatedAt: 'desc' }
        });

        const announcements = await prisma.announcement.findMany({
            take: 2,
            orderBy: { createdAt: 'desc' },
            include: { author: { select: { name: true } } }
        });

        // 4b. Real in-app notifications addressed to THIS user (e.g. approval
        // requests routed to them as a reporting manager). These come from the
        // Notification table via createNotification (lib/notification.js).
        const dbNotifications = await prisma.notification.findMany({
            where: { recipientId: employeeId },
            take: 10,
            orderBy: { createdAt: 'desc' }
        });

        const notifications = [
            ...dbNotifications.map(n => ({
                id: `notif-${n.id}`,
                title: n.title,
                desc: n.message,
                time: new Date(n.createdAt).toLocaleTimeString(),
                updatedAt: n.createdAt,
                link: n.link || null,
                // Highlight pending approval requests; decisions read as success/info.
                type: /awaiting|new .*request|approval/i.test(n.title) ? 'alert' : 'info'
            })),
            ...userLeaves.map(l => ({
                id: `leave-${l.id}`,
                title: `Leave ${l.status}`,
                desc: `Your leave request for ${new Date(l.startDate).toLocaleDateString()} is ${l.status.toLowerCase()}.`,
                time: new Date(l.updatedAt).toLocaleTimeString(),
                updatedAt: l.updatedAt,
                type: l.status === 'Approved' ? 'success' : l.status === 'Rejected' ? 'alert' : 'info'
            })),
            ...recentExpenses.map(e => ({
                id: `exp-${e.id}`,
                title: `Expense ${e.status}`,
                desc: `Expense claim for ₹${e.totalAmount} is ${e.status.toLowerCase()}.`,
                time: new Date(e.updatedAt).toLocaleTimeString(),
                updatedAt: e.updatedAt,
                type: e.status === 'Approved' ? 'success' : e.status === 'Rejected' ? 'alert' : 'info'
            })),
            ...recentPayslips.map(s => ({
                id: `slip-${s.id}`,
                title: "Payslip Generated",
                desc: `Your payslip for ${s.month} ${s.year} is now available.`,
                time: new Date(s.createdAt).toLocaleTimeString(),
                updatedAt: s.createdAt,
                type: 'success'
            })),
            ...announcements.map(a => ({
                id: `ann-${a.id}`,
                title: "New Announcement",
                desc: a.title,
                time: new Date(a.createdAt).toLocaleTimeString(),
                updatedAt: a.createdAt,
                type: 'info'
            }))
        ]
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            .slice(0, 8);

        console.log(`[Stats DEBUG] Fetching data for employeeId: ${employeeId}`);
        console.log(`[Stats DEBUG] Found ${recentPayslips.length} payslips`);

        const mappedPayslips = recentPayslips.map(s => ({
            id: s.id,
            month: `${s.month} ${s.year}`,
            date: new Date(s.createdAt).toLocaleDateString(),
            amount: `₹${s.netPay.toLocaleString('en-IN')}`,
            status: 'Paid'
        }));
        console.log(`[Stats DEBUG] Mapped payslips:`, mappedPayslips);

        console.log(`[Stats] Successfully fetched data for employee ${employeeId}`);
        res.json({
            leaveStats: {
                total,
                used,
                pending,
                available,
                monthlyRemaining,
                leavesThisMonth,
                monthlyLimit: MONTHLY_LEAVE_LIMIT
            },
            notifications,
            recentPayslips: mappedPayslips,
            recentExpenses,
            expenseStats: {
                limit: expenseLimit,
                usedThisMonth: expenseUsedThisMonth,
                remaining: Math.max(0, expenseLimit - expenseUsedThisMonth)
            }
        });
    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({ error: 'Failed' });
    }
}
