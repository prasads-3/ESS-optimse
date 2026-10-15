// Role gate for admin-only routes. Matches the duplicated guard currently in
// api/tasks/routes/index.js and api/field-tasks/routes.js — centralized here so
// future modules share one implementation.
import { ADMIN_ROLES } from '../utils/constants.js';

export default function requireAdmin(req, res, next) {
    if (!ADMIN_ROLES.includes(req.user?.role)) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}
