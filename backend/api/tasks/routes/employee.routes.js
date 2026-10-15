import { Router } from 'express';
import { employeeController } from '../controllers/employee.controller.js';
import { validate, updateDailyTaskSchema } from '../validation/task.validation.js';

const router = Router();

router.get('/my', employeeController.myTasks);
router.patch('/daily/:dailyId', validate(updateDailyTaskSchema), employeeController.updateDaily);
router.get('/:taskId/progress', employeeController.weeklyProgress);

export default router;
