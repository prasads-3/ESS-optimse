// One-time migration: move existing base64 images out of the database and into
// MinIO, replacing each column value with the object's public URL. Targets the
// three columns that historically stored `data:...;base64,...` blobs:
//   - Employee.photo      -> employee-photos/org-<id>/
//   - Expense.receipt     -> expense-receipts/org-<id>/
//   - Leave.document      -> leave-docs/org-<id>/
//
// Safe to re-run: rows whose value is already a URL are skipped (persistDataUrl
// passes them through unchanged, and we only ever select rows still holding a
// `data:` blob). Each row is fetched, uploaded, and updated individually so we
// never load every blob into memory at once.
//
// Usage (from backend/):  node scripts/migrate-images-to-minio.js
//                         node scripts/migrate-images-to-minio.js --dry-run
import 'dotenv/config';
import prisma from '../lib/prisma.js';
import { persistDataUrl } from '../lib/minio.js';

const DRY_RUN = process.argv.includes('--dry-run');

async function migrateModel({ label, model, field, folderFor, docType }) {
    const delegate = prisma[model];
    // Only rows still holding a base64 data URL.
    const rows = await delegate.findMany({
        where: { [field]: { startsWith: 'data:' } },
        select: { id: true },
    });
    console.log(`\n[${label}] ${rows.length} row(s) with base64 ${field} to migrate.`);

    let ok = 0, failed = 0;
    for (const { id } of rows) {
        try {
            const full = await delegate.findUnique({ where: { id }, select: { id: true, [field]: true, organizationId: folderFor.needsOrg } });
            const value = full[field];
            if (!value || !value.startsWith('data:')) continue; // changed since the scan
            const url = await persistDataUrl(value, {
                folder: folderFor.build(full),
                docType,
            });
            if (url === value) { console.warn(`  ! ${label} #${id}: not converted (still base64) — skipped`); failed++; continue; }
            if (!DRY_RUN) {
                await delegate.update({ where: { id }, data: { [field]: url } });
            }
            ok++;
            console.log(`  ${DRY_RUN ? '[dry] ' : ''}${label} #${id} -> ${url}`);
        } catch (err) {
            failed++;
            console.error(`  x ${label} #${id} failed:`, err.message);
        }
    }
    console.log(`[${label}] done: ${ok} migrated, ${failed} failed/skipped.`);
    return { ok, failed, total: rows.length };
}

async function main() {
    console.log(DRY_RUN ? '=== DRY RUN (no DB writes) ===' : '=== MIGRATING base64 images -> MinIO ===');

    // Employee.photo — has organizationId directly on the row.
    await migrateModel({
        label: 'Employee.photo', model: 'employee', field: 'photo', docType: 'photo',
        folderFor: { needsOrg: true, build: (r) => `employee-photos/org-${r.organizationId ?? 'none'}` },
    });

    // Expense.receipt — org lives on the related employee; resolve per row.
    {
        const rows = await prisma.expense.findMany({ where: { receipt: { startsWith: 'data:' } }, select: { id: true } });
        console.log(`\n[Expense.receipt] ${rows.length} row(s) with base64 receipt to migrate.`);
        let ok = 0, failed = 0;
        for (const { id } of rows) {
            try {
                const exp = await prisma.expense.findUnique({ where: { id }, select: { id: true, receipt: true, employee: { select: { organizationId: true } } } });
                if (!exp.receipt?.startsWith('data:')) continue;
                const url = await persistDataUrl(exp.receipt, { folder: `expense-receipts/org-${exp.employee?.organizationId ?? 'none'}`, docType: 'receipt' });
                if (url === exp.receipt) { failed++; continue; }
                if (!DRY_RUN) await prisma.expense.update({ where: { id }, data: { receipt: url } });
                ok++; console.log(`  ${DRY_RUN ? '[dry] ' : ''}Expense.receipt #${id} -> ${url}`);
            } catch (err) { failed++; console.error(`  x Expense #${id} failed:`, err.message); }
        }
        console.log(`[Expense.receipt] done: ${ok} migrated, ${failed} failed/skipped.`);
    }

    // Leave.document — org lives on the related employee; resolve per row.
    {
        const rows = await prisma.leave.findMany({ where: { document: { startsWith: 'data:' } }, select: { id: true } });
        console.log(`\n[Leave.document] ${rows.length} row(s) with base64 document to migrate.`);
        let ok = 0, failed = 0;
        for (const { id } of rows) {
            try {
                const lv = await prisma.leave.findUnique({ where: { id }, select: { id: true, document: true, employee: { select: { organizationId: true } } } });
                if (!lv.document?.startsWith('data:')) continue;
                const url = await persistDataUrl(lv.document, { folder: `leave-docs/org-${lv.employee?.organizationId ?? 'none'}`, docType: 'leave' });
                if (url === lv.document) { failed++; continue; }
                if (!DRY_RUN) await prisma.leave.update({ where: { id }, data: { document: url } });
                ok++; console.log(`  ${DRY_RUN ? '[dry] ' : ''}Leave.document #${id} -> ${url}`);
            } catch (err) { failed++; console.error(`  x Leave #${id} failed:`, err.message); }
        }
        console.log(`[Leave.document] done: ${ok} migrated, ${failed} failed/skipped.`);
    }

    console.log('\nAll done.');
    process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
