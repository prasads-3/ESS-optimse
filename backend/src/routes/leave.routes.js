// Leaves + admin grouped view. Thin-wraps api/leaves and api/admin/leaves/grouped.
import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import adminMock from '../middleware/adminMock.js';
import asyncHandler from '../utils/asyncHandler.js';
import * as leavesRoute from '../../api/leaves/route.js';
import * as adminLeavesGroupedRoute from '../../api/admin/leaves/grouped/route.js';

const router = Router();

router.get('/leaves', authenticate, adminMock, asyncHandler(leavesRoute.GET));
router.post('/leaves', authenticate, adminMock, asyncHandler(leavesRoute.POST));
router.patch('/leaves/:id', authenticate, adminMock, asyncHandler(leavesRoute.PATCH));
router.delete('/leaves/:id', authenticate, adminMock, asyncHandler(leavesRoute.DELETE));
router.get('/admin/leaves/grouped', authenticate, adminMock, asyncHandler(adminLeavesGroupedRoute.GET));

export default router;
