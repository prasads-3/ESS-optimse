// One-time migration: hash all plaintext Employee passwords with bcrypt.
//
// Safe by design:
//   - Reads in batches; never deletes or resets anything.
//   - Skips rows whose password is already a bcrypt hash ($2a$/$2b$/$2y$),
//     so it is idempotent and re-runnable after a crash.
//   - Skips rows with NULL/empty passwords (those accounts can't log in anyway).
//   - Dry-run by default — prints what it WOULD do without writing.
//
// IMPORTANT deploy order: deploy the bcrypt-aware code FIRST (it accepts both
// hashed and plaintext rows), THEN run this script. Old plaintext-comparing
// code cannot log users in once their rows are hashed.
//
// Usage:
//   node scripts/hash-plaintext-passwords.js           # dry run (no writes)
//   node scripts/hash-plaintext-passwords.js --apply   # hash and update rows
import prisma from '../lib/prisma.js';
import { hashPassword, isHashed } from '../lib/password.js';

const APPLY = process.argv.includes('--apply');
const BATCH = 50; // bcrypt at 12 rounds is ~250ms/hash — keep batches small

async function main() {
    let cursor = 0;
    let hashed = 0, alreadyHashed = 0, empty = 0, failed = 0;

    for (;;) {
        const batch = await prisma.employee.findMany({
            where: { id: { gt: cursor } },
            orderBy: { id: 'asc' },
            take: BATCH,
            select: { id: true, email: true, password: true },
        });
        if (batch.length === 0) break;
        cursor = batch[batch.length - 1].id;

        for (const emp of batch) {
            if (!emp.password) { empty++; continue; }
            if (isHashed(emp.password)) { alreadyHashed++; continue; }

            if (APPLY) {
                try {
                    await prisma.employee.update({
                        where: { id: emp.id },
                        data: { password: await hashPassword(emp.password) },
                    });
                    hashed++;
                } catch (err) {
                    failed++;
                    console.error(`  FAILED id=${emp.id} email=${emp.email}: ${err.message}`);
                }
            } else {
                hashed++; // counted as "would hash"
            }
        }
        console.log(`  ...processed through employee id ${cursor}`);
    }

    console.log('--------------------------------------------------');
    console.log(`${APPLY ? 'Hashed' : 'Would hash'}:   ${hashed}`);
    console.log(`Already bcrypt: ${alreadyHashed}`);
    console.log(`Null/empty:     ${empty}`);
    if (failed > 0) console.log(`FAILED:         ${failed}  <-- re-run to retry`);
    console.log('--------------------------------------------------');
    if (!APPLY) console.log('Dry run only. Re-run with --apply to write changes.');
}

console.log(APPLY ? '=== APPLY MODE: hashing plaintext passwords ===' : '=== DRY RUN: pass --apply to write ===');
try {
    await main();
} finally {
    await prisma.$disconnect();
}
