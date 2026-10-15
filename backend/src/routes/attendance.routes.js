// Attendance + tracking. Thin-wraps api/attendance, api/attendance/mark, api/tracking.
import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import asyncHandler from '../utils/asyncHandler.js';
import { GET as getAttendance } from '../../api/attendance/route.js';
import { POST as markAttendance } from '../../api/attendance/mark/route.js';
import * as trackingRoute from '../../api/tracking/route.js';

const router = Router();

router.get('/tracking', authenticate, asyncHandler(trackingRoute.GET));
router.get('/attendance', authenticate, asyncHandler(getAttendance));
router.post('/attendance/mark', authenticate, asyncHandler(markAttendance));

export default router;
