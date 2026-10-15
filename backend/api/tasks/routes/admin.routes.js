import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';
import {
    validate,
    createTaskSchema,
    createWeekSchema,
    createDailyTaskSchema,
} from '../validation/task.validation.js';

const router = Router();

router.post('/', validate(createTaskSchema), adminController.createTask);
router.post('/:taskId/weeks', validate(createWeekSchema), adminController.addWeek);
router.post('/weeks/:weekId/daily', validate(createDailyTaskSchema), adminController.addDailyTask);
router.get('/', adminController.listAll);
router.delete('/:taskId', adminController.deleteTask);

export default router;
