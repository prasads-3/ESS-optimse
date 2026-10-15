/**
 * Leave-day count — single source of truth on the frontend. Mirrors the backend
 * rule in lib/leave.js so the apply-form preview matches the stored balance.
 *
 * Company policy: only Sunday is the weekly off, so Sundays are EXCLUDED from
 * the count (Mon–Sat range = 6 days). Inclusive of both dates; half-day = 0.5.
 */
const MS_PER_DAY = 86400000;
const SUNDAY = 0;

export function leaveDays(
    start: string | Date | null | undefined,
    end: string | Date | null | undefined,
    isHalfDay = false
): number {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;

    if (isHalfDay) return s.getUTCDay() === SUNDAY ? 0 : 0.5;

    let count = 0;
    let cur = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate());
    const last = Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate());
    while (cur <= last) {
        if (new Date(cur).getUTCDay() !== SUNDAY) count++;
        cur += MS_PER_DAY;
    }
    return count;
}
