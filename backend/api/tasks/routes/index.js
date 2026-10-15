import { Router } from 'express';
import adminRoutes from './admin.routes.js';
import employeeRoutes from './employee.routes.js';

const router = Router();

const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super-admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

router.use('/admin', requireAdmin, adminRoutes);
router.use('/employee', employeeRoutes);

// Centralized error handler for this feature
router.use((err, req, res, _next) => {
    console.error(`[tasks] ${req.method} ${req.originalUrl}:`, err);
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Internal server error' });
});

export default router;
