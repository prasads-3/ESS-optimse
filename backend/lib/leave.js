/**
 * Leave-day accounting helpers — the single source of truth for "how many days
 * is this leave". Used by balance/quota logic so the count is consistent
 * everywhere (api/user/stats, api/leaves POST guard).
 *
 * Company policy: Monday–Saturday are working days, only Sunday is the weekly
 * off, so Sundays are EXCLUDED from leave deduction. A half-day counts as 0.5.
 *   - inclusive of both start and end dates
 *   - every Sunday inside the range is skipped (Mon–Sat range = 6 days)
 *   - a half-day applies to a single working day (0.5)
 */
const MS_PER_DAY = 86400000;
const SUNDAY = 0; // Date.getUTCDay(): 0 = Sunday

export function leaveDays(leave) {
    if (!leave) return 0;
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;

    // Half-day is a single-day request; on a Sunday there is nothing to deduct.
    if (leave.isHalfDay) {
        return start.getUTCDay() === SUNDAY ? 0 : 0.5;
    }

    // Count each calendar day in the inclusive range, skipping Sundays. Work in
    // UTC date-only terms so the server's timezone can't shift a day boundary.
    let count = 0;
    let cur = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
    const last = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
    while (cur <= last) {
        if (new Date(cur).getUTCDay() !== SUNDAY) count++;
        cur += MS_PER_DAY;
    }
    return count;
}

export function sumLeaveDays(leaves) {
    if (!Array.isArray(leaves)) return 0;
    return leaves.reduce((total, l) => total + leaveDays(l), 0);
}
