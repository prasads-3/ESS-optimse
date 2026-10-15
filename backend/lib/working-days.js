// Working-day & leave-day math, in one place so the attendance and leave
// modules share a single source of truth.
//
// Company policy:
//   - Monday–Saturday are working days.
//   - Only Sunday is the weekly off.
//   - Monthly working days are computed dynamically (never a fixed 26):
//         Working Days = Total Days in Month - Sundays - Company Holidays
//   - Leave deduction excludes Sundays (a Mon–Sat leave = 6 leave days).
//
// All dates are handled in UTC date-only terms. Leave dates arrive as
// "YYYY-MM-DD" (parsed by the Date constructor as UTC) and are stored that way,
// so staying in UTC end-to-end avoids the server's local timezone shifting a
// day across a boundary.

// JS getUTCDay(): 0 = Sunday ... 6 = Saturday. Sunday is the only weekly off.
export const WEEKLY_OFF_DAY = 0;

const MS_PER_DAY = 86400000;

// Reduce any Date / date-string to a UTC midnight timestamp (ms).
function toUTCDateMs(value) {
    const d = new Date(value);
    if (isNaN(d.getTime())) return NaN;
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

const isSundayMs = (ms) => new Date(ms).getUTCDay() === WEEKLY_OFF_DAY;

// Normalize a list of holiday dates to a Set of "YEAR-MONTH-DAY" (month 0-based)
// keys for O(1) lookup. Accepts Date objects or date strings.
function holidayKeySet(holidayDates = []) {
    const set = new Set();
    for (const h of holidayDates) {
        const ms = toUTCDateMs(h);
        if (isNaN(ms)) continue;
        const d = new Date(ms);
        set.add(`${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`);
    }
    return set;
}

const dayKey = (ms) => {
    const d = new Date(ms);
    return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
};

// --- Month-level helpers (month is 0-based: 0 = January) --------------------

export function getTotalDaysInMonth(year, month) {
    return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

// How many Sundays fall in the given month.
export function countSundaysInMonth(year, month) {
    const total = getTotalDaysInMonth(year, month);
    let sundays = 0;
    for (let d = 1; d <= total; d++) {
        if (new Date(Date.UTC(year, month, d)).getUTCDay() === WEEKLY_OFF_DAY) sundays++;
    }
    return sundays;
}

// Working days in a month = total days - Sundays - company holidays that fall on
// a working day (a holiday landing on a Sunday is not double-counted).
// `holidayDates` is optional; pass the org's holiday dates for that month to net
// them out. Returns a breakdown so callers can display the components.
export function getWorkingDaysInMonth(year, month, holidayDates = []) {
    const totalDays = getTotalDaysInMonth(year, month);
    const sundays = countSundaysInMonth(year, month);

    const holidaySet = holidayKeySet(holidayDates);
    let holidaysOnWorkingDays = 0;
    for (let d = 1; d <= totalDays; d++) {
        const date = new Date(Date.UTC(year, month, d));
        if (date.getUTCDay() === WEEKLY_OFF_DAY) continue; // Sunday already removed
        if (holidaySet.has(`${year}-${month}-${d}`)) holidaysOnWorkingDays++;
    }

    return {
        totalDays,
        sundays,
        holidays: holidaysOnWorkingDays,
        workingDays: totalDays - sundays - holidaysOnWorkingDays,
    };
}

// --- Range-level helpers ----------------------------------------------------

// Leave days in an inclusive date range, excluding Sundays (and, optionally,
// company holidays). Returns 0 for an invalid or inverted range.
export function countLeaveDays(startDate, endDate, holidayDates = []) {
    let cur = toUTCDateMs(startDate);
    const end = toUTCDateMs(endDate);
    if (isNaN(cur) || isNaN(end) || end < cur) return 0;

    const holidaySet = holidayKeySet(holidayDates);
    let count = 0;
    while (cur <= end) {
        if (!isSundayMs(cur) && !holidaySet.has(dayKey(cur))) count++;
        cur += MS_PER_DAY;
    }
    return count;
}

// Distribute the leave days of an inclusive range across the calendar months it
// touches, excluding Sundays (and optional holidays). Returns a Map of
// "YEAR-MONTH" (month 0-based) -> deductible leave days in that month.
// e.g. a Mon–Sat range straddling a month end splits its 6 days by month.
export function leaveDaysPerMonth(startDate, endDate, holidayDates = []) {
    const result = new Map();
    let cur = toUTCDateMs(startDate);
    const end = toUTCDateMs(endDate);
    if (isNaN(cur) || isNaN(end) || end < cur) return result;

    const holidaySet = holidayKeySet(holidayDates);
    while (cur <= end) {
        if (!isSundayMs(cur) && !holidaySet.has(dayKey(cur))) {
            const d = new Date(cur);
            const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
            result.set(key, (result.get(key) || 0) + 1);
        }
        cur += MS_PER_DAY;
    }
    return result;
}

// Human-friendly label for a "YEAR-MONTH" key, e.g. "February 2026".
export function monthLabel(key) {
    const [year, month] = key.split('-').map(Number);
    return new Date(Date.UTC(year, month, 1)).toLocaleString('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    });
}
