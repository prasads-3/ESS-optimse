// Resolve an employee's reporting manager so leave/cancellation emails and
// in-app notifications can always reach the reporter.
//
// The employee form has two fields — "Reports To (Manager Email)" (reportsTo)
// and "Reporting Manager Name" (reportsToName) — but in practice data is messy:
//   - reportsTo correctly holds an email                → use it
//   - the email was typed into the NAME field instead   → fall back to it
//   - only a manager NAME is recorded                   → look the manager up
// This helper handles all three so the reporter is included regardless of which
// field was filled.
//
// Returns { managerEmail, managerName, managerId } — any of which may be null
// when no manager can be determined.
export async function resolveManager(employee, prisma) {
    let managerEmail = null;
    let managerId = null;
    let managerName = employee.reportsToName || null;

    const reportsTo = (employee.reportsTo || '').trim();
    const reportsToName = (employee.reportsToName || '').trim();

    if (reportsTo.includes('@')) {
        // Intended case: reportsTo is the manager's email.
        managerEmail = reportsTo;
        managerName = reportsToName && !reportsToName.includes('@') ? reportsToName : managerName;
    } else if (reportsToName.includes('@')) {
        // Email was mistakenly entered in the manager-name field.
        managerEmail = reportsToName;
        managerName = reportsTo || managerName;
    } else {
        // Only a name is recorded — look the manager up within the same org.
        const lookupName = reportsTo || reportsToName;
        if (lookupName) {
            managerName = lookupName;
            const manager = await prisma.employee.findFirst({
                where: {
                    organizationId: employee.organizationId,
                    name: { contains: lookupName, mode: 'insensitive' },
                },
                select: { id: true, name: true, email: true },
            });
            if (manager) {
                managerId = manager.id;
                managerName = manager.name || managerName;
                if (manager.email) managerEmail = manager.email;
            }
        }
    }

    // When we resolved an email directly, still try to find the manager's record
    // so in-app notifications (which need an id) and a friendly name work too.
    if (managerEmail && managerId === null) {
        const manager = await prisma.employee.findFirst({
            where: { organizationId: employee.organizationId, email: managerEmail },
            select: { id: true, name: true },
        });
        if (manager) {
            managerId = manager.id;
            managerName = manager.name || managerName;
        }
    }

    return { managerEmail, managerName, managerId };
}
