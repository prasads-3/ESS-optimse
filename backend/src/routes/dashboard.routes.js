// Dashboard + subscription usage + per-user stats. Thin-wraps api/dashboard/stats
// and api/user/stats.
import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import asyncHandler from '../utils/asyncHandler.js';
import { GET as getDashboardStats, SUBSCRIPTION_USAGE as getSubscriptionUsage, ONLINE_EMPLOYEES as getOnlineEmployees, EMPLOYEE_STATUS as getEmployeeStatus, HEARTBEAT as recordHeartbeat } from '../../api/dashboard/stats/route.js';
import { GET as getUserStats } from '../../api/user/stats/route.js';

const router = Router();

router.get('/dashboard/stats', authenticate, asyncHandler(getDashboardStats));
router.get('/dashboard/online-employees', authenticate, asyncHandler(getOnlineEmployees));
router.get('/dashboard/employee-status', authenticate, asyncHandler(getEmployeeStatus));
router.post('/dashboard/heartbeat', authenticate, asyncHandler(recordHeartbeat));
router.get('/subscription/usage', authenticate, asyncHandler(getSubscriptionUsage));
router.get('/user/stats/:id', authenticate, asyncHandler(getUserStats));

export default router;
