// Frontend mirror of lib/working-days.js (backend). Kept deliberately in sync so
// the UI can show the same working-day / leave-day numbers the backend enforces.
//
// Company policy: Monday–Saturday are working days; only Sunday is the weekly
// off. Leave deduction excludes Sundays (Mon–Sat = 6 leave days).
//
// These run on date-only "YYYY-MM-DD" strings (from <input type="date">) using
// local time, which is fine for display because we only ever compare day-of-week
// and calendar day, never instants.

export const WEEKLY_OFF_DAY = 0; // Sunday

const MS_PER_DAY = 86400000;

const parseLocalDate = (value: string): Date | null => {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const isSunday = (d: Date) => d.getDay() === WEEKLY_OFF_DAY;

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

const holidayKeySet = (holidayDates: string[] = []): Set<string> => {
    const set = new Set<string>();
    for (const h of holidayDates) {
        const d = parseLocalDate(h.split("T")[0]);
        if (d) set.add(dayKey(d));
    }
    return set;
};

/** Number of calendar days in a month (month is 0-based: 0 = January). */
export const getTotalDaysInMonth = (year: number, month: number): number =>
    new Date(year, month + 1, 0).getDate();

/** Count Sundays in the given month. */
export const countSundaysInMonth = (year: number, month: number): number => {
    const total = getTotalDaysInMonth(year, month);
    let sundays = 0;
    for (let d = 1; d <= total; d++) {
        if (new Date(year, month, d).getDay() === WEEKLY_OFF_DAY) sundays++;
    }
    return sundays;
};

export interface WorkingDayBreakdown {
    totalDays: number;
    sundays: number;
    holidays: number;
    workingDays: number;
}

/**
 * Working days in a month = total days - Sundays - holidays on working days.
 * Mirrors getWorkingDaysInMonth in lib/working-days.js.
 */
export const getWorkingDaysInMonth = (
    year: number,
    month: number,
    holidayDates: string[] = [],
): WorkingDayBreakdown => {
    const totalDays = getTotalDaysInMonth(year, month);
    const sundays = countSundaysInMonth(year, month);
    const holidaySet = holidayKeySet(holidayDates);

    let holidays = 0;
    for (let d = 1; d <= totalDays; d++) {
        const date = new Date(year, month, d);
        if (date.getDay() === WEEKLY_OFF_DAY) continue;
        if (holidaySet.has(dayKey(date))) holidays++;
    }

    return { totalDays, sundays, holidays, workingDays: totalDays - sundays - holidays };
};

/**
 * Leave days in an inclusive range, excluding Sundays (and optional holidays).
 * Mirrors countLeaveDays in lib/working-days.js. Returns 0 for invalid/inverted.
 */
export const countLeaveDays = (
    startDate: string,
    endDate: string,
    holidayDates: string[] = [],
): number => {
    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);
    if (!start || !end || end < start) return 0;

    const holidaySet = holidayKeySet(holidayDates);
    let count = 0;
    for (let t = start.getTime(); t <= end.getTime(); t += MS_PER_DAY) {
        const d = new Date(t);
        if (!isSunday(d) && !holidaySet.has(dayKey(d))) count++;
    }
    return count;
};

/**
 * Largest number of deductible leave days the range occupies within any single
 * calendar month (Sundays/holidays excluded). Used to validate the monthly limit
 * for multi-month ranges. Mirrors leaveDaysPerMonth in lib/working-days.js.
 */
export const maxLeaveDaysInAnyMonth = (
    startDate: string,
    endDate: string,
    holidayDates: string[] = [],
): number => {
    const start = parseLocalDate(startDate);
    const end = parseLocalDate(endDate);
    if (!start || !end || end < start) return 0;

    const holidaySet = holidayKeySet(holidayDates);
    const perMonth = new Map<string, number>();
    for (let t = start.getTime(); t <= end.getTime(); t += MS_PER_DAY) {
        const d = new Date(t);
        if (isSunday(d) || holidaySet.has(dayKey(d))) continue;
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        perMonth.set(key, (perMonth.get(key) || 0) + 1);
    }
    return perMonth.size ? Math.max(...perMonth.values()) : 0;
};
