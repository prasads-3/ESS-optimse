// Super-admin surface: stats, activity, plans, custom-plans, org-email broadcast,
// notifications, and admin login-logs. Thin-wraps the matching api/* handlers.
// All guarded with authenticate only (role checks live inside the handlers), as
// in the original server.js. Route order preserved.
import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import adminMock from '../middleware/adminMock.js';
import asyncHandler from '../utils/asyncHandler.js';
import * as superAdminStatsRoute from '../../api/super-admin/stats/route.js';
import * as superAdminActivityRoute from '../../api/super-admin/activity/route.js';
import * as superAdminNotificationsRoute from '../../api/super-admin/notifications/route.js';
import * as superAdminPlansRoute from '../../api/super-admin/plans/route.js';
import * as sendOrganizationEmailRoute from '../../api/super-admin/send-organization-email/route.js';
import * as publicPlansRoute from '../../api/plans/route.js';
import * as customPlansRoute from '../../api/custom-plans/route.js';
import * as adminLoginLogsRoute from '../../api/admin/login-logs/route.js';

const router = Router();

router.get('/admin/login-logs', authenticate, adminMock, asyncHandler(adminLoginLogsRoute.GET));

router.get('/super-admin/stats', authenticate, asyncHandler(superAdminStatsRoute.GET));
router.get('/super-admin/activity', authenticate, asyncHandler(superAdminActivityRoute.GET));
router.get('/super-admin/plans', authenticate, asyncHandler(superAdminPlansRoute.GET));
router.get('/plans', authenticate, asyncHandler(publicPlansRoute.GET));
router.post('/super-admin/plans', authenticate, asyncHandler(superAdminPlansRoute.POST));
router.patch('/super-admin/plans/:id', authenticate, asyncHandler(superAdminPlansRoute.PATCH));
router.delete('/super-admin/plans/:id', authenticate, asyncHandler(superAdminPlansRoute.DELETE));

// Custom Plan Requests
router.post('/custom-plans', authenticate, asyncHandler(customPlansRoute.POST));
router.get('/super-admin/custom-plans', authenticate, asyncHandler(customPlansRoute.GET));
router.patch('/super-admin/custom-plans/:id', authenticate, asyncHandler(customPlansRoute.PATCH));

// Org-wide email broadcast (`/api/send-organization-email` is the spec'd path;
// the namespaced alias keeps it grouped with other SA routes).
router.post('/send-organization-email', authenticate, asyncHandler(sendOrganizationEmailRoute.POST));
router.post('/super-admin/send-organization-email', authenticate, asyncHandler(sendOrganizationEmailRoute.POST));
router.get('/super-admin/email-history', authenticate, asyncHandler(sendOrganizationEmailRoute.GET));

// Super Admin Notifications
router.get('/super-admin/notifications', authenticate, asyncHandler(superAdminNotificationsRoute.GET));
router.patch('/super-admin/notifications/:id', authenticate, asyncHandler(superAdminNotificationsRoute.PATCH));
router.post('/super-admin/notifications/mark-all-read', authenticate, asyncHandler(superAdminNotificationsRoute.POST));
router.get('/super-admin/notifications/unread-count', authenticate, asyncHandler(superAdminNotificationsRoute.GET_UNREAD_COUNT));

export default router;
