// Feature routers for Task Management and Field Task Tracking. These already
// follow the routes→controller→service pattern under api/tasks and
// api/field-tasks; we reuse them as-is. authenticate is applied at mount time,
// exactly as in server.js (`app.use('/api/tasks', authenticateToken, tasksRouter)`).
import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import tasksRouter from '../../api/tasks/routes/index.js';
import fieldTasksRouter from '../../api/field-tasks/routes.js';

const router = Router();

router.use('/tasks', authenticate, tasksRouter);
router.use('/field-tasks', authenticate, fieldTasksRouter);

export default router;
