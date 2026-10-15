// Shared constants. Room helpers already live in lib/realtime.js — re-export
// the role strings here so middleware/controllers don't sprinkle string literals.
export const ROLES = {
    ADMIN: 'admin',
    SUPER_ADMIN: 'super-admin',
    EMPLOYEE: 'employee',
};

export const ADMIN_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN];
