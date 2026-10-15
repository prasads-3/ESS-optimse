import prisma from './prisma.js';

/**
 * Central multi-tenant isolation helpers.
 *
 * Every query/mutation that touches org-owned data must scope to the caller's
 * organization. The single source of truth for "which org is this request
 * allowed to see" is the authenticated JWT (`req.user`) — never the request
 * body. Super-admin (no organizationId) bypasses all scoping.
 *
 * Two enforcement styles are provided on purpose:
 *   - assertSameOrg(): throws a {status} error — for the feature routers
 *     (field-tasks, tasks) whose handlers forward errors to next(err).
 *   - checkSameOrg(): writes a 403 and returns false — for the flat
 *     api/*\/route.js handlers that catch-and-respond directly.
 */

const isSuperAdmin = (req) => req?.user?.role === 'super-admin';

const httpError = (status, message) =>
    Object.assign(new Error(message), { status });

/**
 * The org id this request is scoped to, or null for super-admin (unscoped).
 * Throws 401 if a non-super-admin somehow has no organizationId on their token.
 */
export function resolveOrgId(req) {
    if (isSuperAdmin(req)) return null;
    const raw = req?.user?.organizationId;
    if (raw === undefined || raw === null || raw === '') {
        throw httpError(401, 'No organization associated with this account');
    }
    const id = parseInt(raw, 10);
    if (Number.isNaN(id)) {
        throw httpError(401, 'Invalid organization on session');
    }
    return id;
}

/**
 * A Prisma `where` fragment scoping to the caller's org.
 *   tenantWhere(req)                          -> { organizationId } | {}
 *   tenantWhere(req, { relation: 'employee' }) -> { employee: { organizationId } } | {}
 * Returns {} for super-admin (sees all orgs).
 */
export function tenantWhere(req, { relation } = {}) {
    const orgId = resolveOrgId(req);
    if (orgId === null) return {};
    return relation ? { [relation]: { organizationId: orgId } } : { organizationId: orgId };
}

/**
 * Read a row's org id given the access path.
 *   rowOrgId(row)                      -> row.organizationId
 *   rowOrgId(row, { via: 'employee' }) -> row.employee?.organizationId
 * The relation must have been included when the row was loaded.
 */
export function rowOrgId(row, { via } = {}) {
    if (!row) return undefined;
    return via ? row[via]?.organizationId : row.organizationId;
}

/**
 * Throw 403 if `row` belongs to a different org than the caller. No-op for
 * super-admin. Fails closed: a row with no resolvable org id is denied.
 */
export function assertSameOrg(req, row, opts = {}) {
    const orgId = resolveOrgId(req);
    if (orgId === null) return; // super-admin
    const rowOrg = rowOrgId(row, opts);
    if (rowOrg === undefined || rowOrg === null || rowOrg !== orgId) {
        throw httpError(403, 'Forbidden: resource belongs to another organization');
    }
}

/**
 * Express-friendly variant of assertSameOrg for handlers that respond directly.
 * Returns true when the row is in the caller's org (or caller is super-admin);
 * otherwise writes a 403 response and returns false.
 */
export function checkSameOrg(req, res, row, opts = {}) {
    try {
        assertSameOrg(req, row, opts);
        return true;
    } catch (err) {
        res.status(err.status || 403).json({ error: err.message });
        return false;
    }
}

/**
 * The set of employee emails in the caller's org, or null for super-admin.
 * Used to scope models that have no organizationId column but reference an
 * employee by email (e.g. Task.assignedTo). Emails are returned as stored so
 * they match exactly how `assignedTo` was persisted (= the employee's email).
 */
export async function orgEmployeeEmails(req) {
    const orgId = resolveOrgId(req);
    if (orgId === null) return null; // super-admin -> unscoped
    const employees = await prisma.employee.findMany({
        where: { organizationId: orgId },
        select: { email: true },
    });
    return employees.map((e) => e.email).filter(Boolean);
}
