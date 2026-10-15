// Backfills the EmployeeLocation and EmailRecipient tables from the
// deprecated JSON columns (Employee.locationHistory, EmailBroadcast.recipients
// / EmailBroadcast.failures).
//
// Idempotent and re-runnable: parents that already have rows in the target
// table are skipped, so a crash mid-run can simply be re-run. The JSON columns
// are never modified — rollback is just TRUNCATE of the new tables.
//
// Usage:
//   node scripts/migrate-json-to-tables.js           # dry run (default, no writes)
//   node scripts/migrate-json-to-tables.js --apply   # write rows
import prisma from '../lib/prisma.js';

const APPLY = process.argv.includes('--apply');
const BATCH = 100;

const toDate = (v, fallback) => {
    const d = v ? new Date(v) : null;
    return d && !isNaN(d.getTime()) ? d : fallback;
};

const toNum = (v) => {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return typeof n === 'number' && !isNaN(n) ? n : null;
};

async function migrateLocations() {
    let cursor = 0, employees = 0, rows = 0, skippedDone = 0, droppedEntries = 0;
    for (;;) {
        const batch = await prisma.employee.findMany({
            where: { id: { gt: cursor } },
            orderBy: { id: 'asc' },
            take: BATCH,
            select: { id: true, locationHistory: true },
        });
        if (batch.length === 0) break;
        cursor = batch[batch.length - 1].id;

        for (const emp of batch) {
            const history = Array.isArray(emp.locationHistory) ? emp.locationHistory : [];
            if (history.length === 0) continue;

            // Idempotency: skip employees whose history is already backfilled.
            const existing = await prisma.employeeLocation.count({ where: { employeeId: emp.id } });
            if (existing > 0) { skippedDone++; continue; }

            const data = [];
            for (const e of history) {
                const lat = toNum(e?.lat);
                const lng = toNum(e?.lng);
                if (lat === null || lng === null) { droppedEntries++; continue; }
                data.push({
                    employeeId: emp.id,
                    latitude:   lat,
                    longitude:  lng,
                    accuracy:   toNum(e.accuracy),
                    city:       e.city ?? null,
                    area:       e.area ?? null,
                    address:    e.address ?? null,
                    action:     e.action ?? null,
                    ipAddress:  e.ipAddress ?? null,
                    deviceType: e.deviceType ?? null,
                    deviceInfo: e.deviceInfo ?? null,
                    recordedAt: toDate(e.timestamp, new Date()),
                });
            }
            if (data.length === 0) continue;

            if (APPLY) await prisma.employeeLocation.createMany({ data });
            employees++;
            rows += data.length;
        }
    }
    console.log(`[locations] ${APPLY ? 'migrated' : 'would migrate'} ${rows} rows across ${employees} employees`
        + ` (${skippedDone} already backfilled, ${droppedEntries} entries without coordinates dropped)`);
}

async function migrateEmailRecipients() {
    let cursor = 0, broadcasts = 0, rows = 0, skippedDone = 0;
    for (;;) {
        const batch = await prisma.emailBroadcast.findMany({
            where: { id: { gt: cursor } },
            orderBy: { id: 'asc' },
            take: BATCH,
        });
        if (batch.length === 0) break;
        cursor = batch[batch.length - 1].id;

        for (const b of batch) {
            const recipients = Array.isArray(b.recipients) ? b.recipients : [];
            const failures   = Array.isArray(b.failures)   ? b.failures   : [];
            if (recipients.length === 0 && failures.length === 0) continue;

            // Idempotency: skip broadcasts already backfilled.
            const existing = await prisma.emailRecipient.count({ where: { broadcastId: b.id } });
            if (existing > 0) { skippedDone++; continue; }

            // failures shape: [{ recipient, error }] (see lib/email.js)
            const failureByEmail = new Map(
                failures
                    .filter(f => f && f.recipient)
                    .map(f => [String(f.recipient).trim().toLowerCase(), f.error || 'unknown error'])
            );

            const seen = new Set();
            const data = [];
            for (const r of recipients) {
                const email = String(r).trim();
                const key = email.toLowerCase();
                if (!email || seen.has(key)) continue;
                seen.add(key);
                const error = failureByEmail.get(key);
                data.push({
                    broadcastId:  b.id,
                    email,
                    status:       error ? 'failed' : 'sent',
                    // Best available timestamp — the JSON never recorded per-send times.
                    sentAt:       error ? null : b.createdAt,
                    failedAt:     error ? b.createdAt : null,
                    errorMessage: error ?? null,
                    createdAt:    b.createdAt,
                });
            }
            // Defensive: failures whose address never appeared in recipients.
            for (const [key, error] of failureByEmail) {
                if (seen.has(key)) continue;
                data.push({
                    broadcastId: b.id,
                    email: key,
                    status: 'failed',
                    failedAt: b.createdAt,
                    errorMessage: error,
                    createdAt: b.createdAt,
                });
            }
            if (data.length === 0) continue;

            if (APPLY) await prisma.emailRecipient.createMany({ data, skipDuplicates: true });
            broadcasts++;
            rows += data.length;
        }
    }
    console.log(`[email] ${APPLY ? 'migrated' : 'would migrate'} ${rows} rows across ${broadcasts} broadcasts`
        + ` (${skippedDone} already backfilled)`);
}

console.log(APPLY ? '=== APPLY MODE: writing rows ===' : '=== DRY RUN: pass --apply to write ===');
try {
    await migrateLocations();
    await migrateEmailRecipients();
} finally {
    await prisma.$disconnect();
}
