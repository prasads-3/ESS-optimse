// API router aggregator. Mounted once at /api in app.js. Each feature router
// declares its own full sub-paths (e.g. '/leaves', '/organizations'), except the
// Employee MVC router which is mounted at its own '/employees' prefix. Because
// every feature owns a distinct path prefix, mount order here does not affect
// matching; ordering quirks that DO matter (e.g. /org/:slug before /org/by-email)
// are preserved inside the individual routers.
import { Router } from 'express';

import employeeRoutes from './employee.routes.js';
import authRoutes from './auth.routes.js';
import organizationRoutes from './organization.routes.js';
import leaveRoutes from './leave.routes.js';
import expenseRoutes from './expense.routes.js';
import attendanceRoutes from './attendance.routes.js';
import referralRoutes from './referral.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import hrRoutes from './hr.routes.js';
import moneyRoutes from './money.routes.js';
import superAdminRoutes from './superAdmin.routes.js';
import uploadRoutes from './upload.routes.js';
import taskRoutes from './task.routes.js';

const router = Router();

router.use('/employees', employeeRoutes);

router.use('/', authRoutes);
router.use('/', organizationRoutes);
router.use('/', leaveRoutes);
router.use('/', expenseRoutes);
router.use('/', attendanceRoutes);
router.use('/', referralRoutes);
router.use('/', dashboardRoutes);
router.use('/', hrRoutes);
router.use('/', moneyRoutes);
router.use('/', superAdminRoutes);
router.use('/', uploadRoutes);
router.use('/', taskRoutes);

export default router;
