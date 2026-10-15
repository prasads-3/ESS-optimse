import { Router } from 'express';
import { fieldTaskController } from './controller.js';
import {
    validate,
    createFieldTaskSchema,
    createFieldTaskBatchSchema,
    checkInSchema,
    checkOutSchema,
    notVisitedSchema,
    updateFieldTaskSchema,
    adminUpdateFieldTaskSchema,
    reassignFieldTaskSchema,
    remarkFieldTaskSchema,
} from './validation.js';

const router = Router();

const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super-admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

/* Admin */
router.post('/admin', requireAdmin, validate(createFieldTaskSchema), fieldTaskController.create);
router.post('/admin/batch', requireAdmin, validate(createFieldTaskBatchSchema), fieldTaskController.createBatch);
router.get('/admin', requireAdmin, fieldTaskController.listAll);
router.patch('/admin/:id/reassign', requireAdmin, validate(reassignFieldTaskSchema), fieldTaskController.reassign);
router.patch('/admin/:id/remark', requireAdmin, validate(remarkFieldTaskSchema), fieldTaskController.setRemark);
router.patch('/admin/:id', requireAdmin, validate(adminUpdateFieldTaskSchema), fieldTaskController.adminUpdate);
router.delete('/admin/:id', requireAdmin, fieldTaskController.remove);

/* Employee */
router.get('/my', fieldTaskController.myTasks);
router.get('/:id', fieldTaskController.getOne);
router.post('/:id/check-in', validate(checkInSchema), fieldTaskController.checkIn);
router.post('/:id/check-out', validate(checkOutSchema), fieldTaskController.checkOut);
router.post('/:id/not-visited', validate(notVisitedSchema), fieldTaskController.markNotVisited);
router.patch('/:id', validate(updateFieldTaskSchema), fieldTaskController.update);

// Feature-scoped error handler
router.use((err, req, res, _next) => {
    console.error(`[field-tasks] ${req.method} ${req.originalUrl}:`, err);
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

export default router;
