// Run with:  node scripts/diagnose-login.js  (optionally pass an email)
// Reports every employee row matching a given email (case-insensitive) and
// flags rows with missing organizationId — the two failure modes behind
// "employee can't log in" after centralizing auth.

import prisma from '../lib/prisma.js';

const targetEmail = (process.argv[2] || '').trim().toLowerCase();

async function main() {
    console.log('--- Login diagnostic ---');

    const orphans = await prisma.employee.findMany({
        where: { organizationId: null },
        select: { id: true, email: true, role: true, employeeId: true, createdAt: true }
    });
    if (orphans.length) {
        console.log(`\n[!] ${orphans.length} employee row(s) with NULL organizationId (will fail multi-tenant scoping):`);
        for (const o of orphans) console.log(`    id=${o.id} email=${o.email} role=${o.role} employeeId=${o.employeeId}`);
    } else {
        console.log('\n[OK] No employees with null organizationId.');
    }

    if (!targetEmail) {
        console.log('\nNo email arg provided. Pass one to inspect a specific login:');
        console.log('    node scripts/diagnose-login.js employee@example.com');
        return;
    }

    const matches = await prisma.employee.findMany({
        where: { email: { equals: targetEmail, mode: 'insensitive' } },
        include: { organization: { select: { id: true, name: true, slug: true } } }
    });

    console.log(`\nLooking up email="${targetEmail}" (case-insensitive) ...`);
    if (matches.length === 0) {
        console.log('[X] No employee found. The admin who created this account may have used a different email.');
        return;
    }
    for (const m of matches) {
        console.log(`  - id=${m.id} email="${m.email}" role=${m.role} orgId=${m.organizationId}` +
            ` org="${m.organization?.name || 'NULL'}" (${m.organization?.slug || '-'})` +
            ` isTemp=${m.isTemporaryPassword} passwordLen=${m.password?.length ?? 0}`);
    }
    if (matches.length > 1) {
        console.log(`[i] ${matches.length} accounts share this email — login disambiguates by password match, then by most recently created.`);
    }
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
