import prisma from '../../lib/prisma.js';
import { checkFeature } from '../../lib/feature-gate.js';
import { getWorkingDaysInMonth } from '../../lib/working-days.js';

export async function GET(req, res) {
    // Feature Gating
    const access = await checkFeature(req, 'attendance');
    if (!access.allowed) {
        return res.status(403).json({ error: 'Feature Restricted', message: access.reason });
    }

    const monthStr = req.query.month;
    const yearStr = req.query.year;
    const userIdStr = req.query.userId;
    const now = new Date();

    const isYearly = monthStr === 'all';
    const month = !isYearly ? (monthStr ? parseInt(monthStr) - 1 : now.getMonth()) : null;
    let year = yearStr ? parseInt(yearStr) : now.getFullYear();

    // Safety check for invalid year/month
    if (isNaN(year)) year = now.getFullYear();
    if (!isYearly && isNaN(month)) return res.status(400).json({ error: 'Invalid month' });

    // Strict organization isolation
    let orgId = null;
    if (req.user && req.user.role !== 'super-admin') {
        if (!req.user.organizationId) {
            return res.status(401).json({ error: 'Unauthorized: No organization associated with your account' });
        }
        orgId = parseInt(req.user.organizationId);
    }

    const targetUserId = userIdStr ? parseInt(userIdStr) : null;

    const startTime = Date.now();
    try {
        // 1. Fetch employee(s)
        const employeeWhere = targetUserId ? { id: targetUserId } : {};
        if (orgId) {
            employeeWhere.organizationId = orgId;
        }

        const rawEmployees = await prisma.employee.findMany({
            where: employeeWhere,
            select: {
                id: true,
                name: true,
                employeeId: true,
                joiningDate: true,
                status: true,
                organizationId: true,
                role: true
            },
            orderBy: { name: 'asc' }
        });

        const employees = targetUserId
            ? rawEmployees
            : rawEmployees.filter(e => {
                const role = (e.role || '').toLowerCase();
                if (role === 'admin' || role === 'super-admin') return false;
                if ((e.employeeId || '').toUpperCase().startsWith('ADM-')) return false;
                return true;
            });

        if (!employees || employees.length === 0) {
            console.log(`[ATTENDANCE] No employees found. Duration: ${Date.now() - startTime}ms`);
            return res.json({
                year,
                month: isYearly ? 'all' : (month || 0) + 1,
                isYearly,
                attendance: []
            });
        }

        // 2. Fetch all login logs for the range
        const startDate = isYearly ? new Date(`${year}-01-01T00:00:00.000Z`) : new Date(`${year}-${String((month || 0) + 1).padStart(2, '0')}-01T00:00:00.000Z`);
        const endDateObj = isYearly
            ? new Date(`${year}-12-31T23:59:59.999Z`)
            : new Date(Date.UTC(year, (month || 0) + 1, 0, 23, 59, 59, 999));

        const loginLogs = await prisma.loginLog.findMany({
            where: {
                userId: targetUserId ? targetUserId : { in: employees.map(e => e.id) },
                deviceType: 'Manual Form',
                loginTime: {
                    gte: startDate,
                    lte: endDateObj
                }
            },
            select: {
                userId: true,
                loginTime: true,
                loginCity: true,
                loginArea: true
            }
        });

        const endDate = endDateObj;

        // 3. Fetch leaves that mark attendance. A leave marks its days as "L" as
        // soon as it is applied (Pending), not only once Approved — so applying a
        // leave immediately reflects on the sheet. Rejected/Cancelled leaves are
        // excluded so a declined request reverts those days to normal.
        const leaves = await prisma.leave.findMany({
            where: {
                employeeId: targetUserId ? targetUserId : { in: employees.map(e => e.id) },
                status: { in: ['Pending', 'Approved'] },
                OR: [
                    { startDate: { lte: endDate }, endDate: { gte: startDate } }
                ]
            }
        });

        // 4. Fetch holidays
        const holidays = await prisma.holiday.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        });

        // Helper: extract YYYY, M (0-indexed), D from a Date using IST local time
        const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
        const toISTparts = (date) => {
            if (!date) return { y: 0, m: 0, d: 0 };
            const ist = new Date(date.getTime() + IST_OFFSET_MS);
            return { y: ist.getUTCFullYear(), m: ist.getUTCMonth(), d: ist.getUTCDate() };
        };

        // 5. Pre-process for O(1) lookups
        const holidayMap = new Map();
        holidays.forEach(h => {
            if (!h.date) return;
            const { y, m, d } = toISTparts(new Date(h.date));
            holidayMap.set(`${y}-${m}-${d}`, h);
        });

        const loginMap = new Map();
        loginLogs.forEach(log => {
            if (!log.loginTime || !log.userId) return;
            const { m, d } = toISTparts(new Date(log.loginTime));
            
            const key = `${log.userId}-${m}-${d}`;
            loginMap.set(key, {
                isPresent: true,
                location: log.loginCity ? `${log.loginArea ? log.loginArea + ', ' : ''}${log.loginCity}` : 'Primary Office'
            });
        });

        const leaveMap = new Map();
        leaves.forEach(l => {
            if (!l.startDate || !l.endDate || !l.employeeId) return;
            const startStr = new Date(l.startDate);
            const endStr = new Date(l.endDate);
            const current = new Date(startStr);
            current.setUTCHours(0, 0, 0, 0);
            while (current <= endStr) {
                const { m, d } = toISTparts(current);
                leaveMap.set(`${l.employeeId}-${m}-${d}`, true);
                current.setUTCDate(current.getUTCDate() + 1);
            }
        });

        // Pre-calculate weekends for the year to avoid expensive Date objects in the loop
        const weekendMap = new Map();
        if (isYearly) {
            for (let m = 0; m < 12; m++) {
                const daysInM = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
                for (let d = 1; d <= daysInM; d++) {
                    const istDate = new Date(Date.UTC(year, m, d) + IST_OFFSET_MS);
                    const dayOfWeek = istDate.getUTCDay();
                    // Only Sunday (0) is a weekend; Saturday is a working day.
                    if (dayOfWeek === 0) {
                        weekendMap.set(`${m}-${d}`, true);
                    }
                }
            }
        }

        // 6. Process data
        const attendanceData = employees.map(emp => {
            const days = {};
            const locations = {};

            const processRange = (mIdx) => {
                if (mIdx < 0 || mIdx > 11) return;
                const daysInM = new Date(Date.UTC(year, mIdx + 1, 0)).getUTCDate();
                for (let d = 1; d <= daysInM; d++) {
                    const currentDateKey = `${year}-${mIdx}-${d}`;
                    const userDateKey = `${emp.id}-${mIdx}-${d}`;
                    const dayKey = isYearly
                        ? `${(mIdx + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`
                        : d.toString().padStart(2, '0');

                    const holiday = holidayMap.get(currentDateKey);
                    const loginInfo = loginMap.get(userDateKey);
                    const onLeave = leaveMap.has(userDateKey);
                    
                    let isWeekend = false;
                    if (isYearly) {
                        isWeekend = weekendMap.has(`${mIdx}-${d}`);
                    } else {
                        const istDate = new Date(Date.UTC(year, mIdx, d) + IST_OFFSET_MS);
                        const dayOfWeek = istDate.getUTCDay();
                        // Only Sunday (0) is a weekend; Saturday is a working day.
                        isWeekend = dayOfWeek === 0;
                    }

                    // Leave wins over Present: if the day is covered by a leave,
                    // mark it "L" even when the employee logged in that day (e.g.
                    // they only logged in to apply for the leave).
                    let status = '';
                    if (onLeave) status = 'L';
                    else if (loginInfo?.isPresent) {
                        status = 'P';
                        locations[dayKey] = loginInfo.location;
                    }
                    else if (holiday) status = 'H';
                    else if (isWeekend) status = 'W';

                    days[dayKey] = status;
                }
            };

            if (isYearly) {
                for (let m = 0; m < 12; m++) processRange(m);
            } else {
                processRange(month);
            }

            return {
                id: emp.id,
                name: emp.name,
                employeeId: emp.employeeId,
                days,
                locations
            };
        });

        const daysInMonth = isYearly ? null : new Date(Date.UTC(year, (month || 0) + 1, 0)).getUTCDate();

        // Dynamic working-day calculation per company policy (Mon–Sat working,
        // Sunday off), netting out company holidays that fall on a working day.
        // Never a fixed value — derived from the selected month/year.
        const holidayDates = holidays.map(h => h.date).filter(Boolean);
        let workingDays;
        if (isYearly) {
            const breakdown = { totalDays: 0, sundays: 0, holidays: 0, workingDays: 0 };
            for (let m = 0; m < 12; m++) {
                const b = getWorkingDaysInMonth(year, m, holidayDates);
                breakdown.totalDays += b.totalDays;
                breakdown.sundays += b.sundays;
                breakdown.holidays += b.holidays;
                breakdown.workingDays += b.workingDays;
            }
            workingDays = breakdown;
        } else {
            workingDays = getWorkingDaysInMonth(year, month, holidayDates);
        }

        console.log(`[ATTENDANCE] Fetch completed for ${employees.length} emps. Duration: ${Date.now() - startTime}ms`);
        return res.json({
            year,
            month: isYearly ? 'all' : (month || 0) + 1,
            isYearly,
            daysInMonth,
            workingDays,
            attendance: attendanceData
        });
    } catch (error) {
        console.error('CRITICAL: Error fetching attendance:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
