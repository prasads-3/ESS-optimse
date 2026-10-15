// Employee routes. Mounted at /api/employees in routes/index.js. Same guard
// chain as the original server.js registrations: authenticate + adminMock.
// The original mapped GET /api/employees/:id to the same GET handler as the list
// (which branched on req.params.id); here it routes to the dedicated getById.
import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import adminMock from '../middleware/adminMock.js';
import asyncHandler from '../utils/asyncHandler.js';
import * as ctrl from '../controllers/employee.controller.js';

const router = Router();

router.use(authenticate, adminMock);

router.get('/', asyncHandler(ctrl.list));
router.get('/:id', asyncHandler(ctrl.getById));
router.post('/', asyncHandler(ctrl.create));
router.put('/:id', asyncHandler(ctrl.update));
router.delete('/:id', asyncHandler(ctrl.remove));

export default router;
