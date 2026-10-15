// Centralized leave-policy rules so the API and any callers share one source of
// truth. The headline rule: an employee may take at most MONTHLY_LEAVE_LIMIT
// leave *days* in any single calendar month. Leave days are counted per company
// policy — inclusive of both From/To dates but EXCLUDING Sundays (the weekly
// off), so a Mon–Sat request is 6 leave days. A request that spans two months
// is checked against each month's own remaining allowance independently.
//
// All day/working-day math lives in ./working-days.js so the leave and
// attendance modules stay in sync.

import {
    countLeaveDays as countWorkingLeaveDays,
    leaveDaysPerMonth,
    monthLabel,
} from './working-days.js';

export const MONTHLY_LEAVE_LIMIT = 2;
export const YEARLY_LEAVE_LIMIT = 24;

// Re-export so existing importers can keep using these from leave-policy.
export { monthLabel };

// Inclusive leave-day count between two dates, excluding Sundays. Returns 0 for
// an invalid or inverted range.
export function countLeaveDays(startDate, endDate, holidayDates = []) {
    return countWorkingLeaveDays(startDate, endDate, holidayDates);
}

function toUTCDateMs(value) {
    const d = new Date(value);
    if (isNaN(d.getTime())) return NaN;
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

// Validate a requested leave range against existing leaves for the same
// employee. `existingLeaves` is the list of that employee's non-rejected leaves
// that overlap the affected period (each item needs startDate & endDate).
// `holidayDates` is optional and, when supplied, is also excluded from leave
// deduction.
//
// Returns { valid: true } or
// { valid: false, code, message, remaining, month } so the API can respond with
// a clear, consistent payload.
export function validateLeaveRequest(startDate, endDate, existingLeaves = [], holidayDates = []) {
    const start = toUTCDateMs(startDate);
    const end = toUTCDateMs(endDate);

    if (isNaN(start) || isNaN(end)) {
        return { valid: false, code: 'INVALID_DATE', message: 'Please provide a valid From Date and To Date.' };
    }
    if (end < start) {
        return { valid: false, code: 'INVALID_RANGE', message: 'From Date cannot be after To Date.' };
    }

    const requestedPerMonth = leaveDaysPerMonth(startDate, endDate, holidayDates);

    // A range made up entirely of Sundays deducts nothing — there is nothing to
    // validate (and nothing to save against the quota).
    if (requestedPerMonth.size === 0) {
        return { valid: false, code: 'NO_LEAVE_DAYS', message: 'The selected range contains no working days (Sundays are not counted as leave).' };
    }

    // Tally how many leave days the employee has already committed in each
    // affected month / year from their existing (pending or approved) leaves,
    // using the same Sunday-excluding rule.
    const usedPerMonth = new Map();
    const usedPerYear = new Map();
    for (const leave of existingLeaves) {
        for (const [key, days] of leaveDaysPerMonth(leave.startDate, leave.endDate, holidayDates)) {
            usedPerMonth.set(key, (usedPerMonth.get(key) || 0) + days);
            const year = key.split('-')[0];
            usedPerYear.set(year, (usedPerYear.get(year) || 0) + days);
        }
    }

    // Monthly limit — checked per affected month so a multi-month request is
    // judged against each month's own remaining balance.
    for (const [key, requestedDays] of requestedPerMonth) {
        const used = usedPerMonth.get(key) || 0;
        if (used + requestedDays > MONTHLY_LEAVE_LIMIT) {
            const remaining = Math.max(0, MONTHLY_LEAVE_LIMIT - used);
            const label = monthLabel(key);
            const message = remaining === 0
                ? `Monthly leave limit exceeded for ${label}. Only ${MONTHLY_LEAVE_LIMIT} leave days are allowed per month.`
                : `Monthly leave limit exceeded for ${label}. Remaining leave days: ${remaining}`;
            return { valid: false, code: 'MONTHLY_LIMIT', message, remaining, month: label };
        }
    }

    // Yearly limit — aggregate the requested days by year and apply the same
    // "already-used + requested" comparison.
    const requestedPerYear = new Map();
    for (const [key, days] of requestedPerMonth) {
        const year = key.split('-')[0];
        requestedPerYear.set(year, (requestedPerYear.get(year) || 0) + days);
    }
    for (const [year, requestedDays] of requestedPerYear) {
        const used = usedPerYear.get(year) || 0;
        if (used + requestedDays > YEARLY_LEAVE_LIMIT) {
            const remaining = Math.max(0, YEARLY_LEAVE_LIMIT - used);
            return {
                valid: false,
                code: 'YEARLY_LIMIT',
                message: `Annual leave limit exceeded for ${year}. Remaining leave days: ${remaining}`,
                remaining,
                year,
            };
        }
    }

    return { valid: true };
}
