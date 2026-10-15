// HR data: policies, salary-slips, holidays, announcements, admin payroll grouped.
// Thin-wraps the matching api/* handlers. Guard chains match server.js exactly —
// note announcements use authenticate WITHOUT adminMock (as in the original).
import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import adminMock from '../middleware/adminMock.js';
import asyncHandler from '../utils/asyncHandler.js';
import { GET as getPolicies, POST as createPolicy, DELETE as deletePolicy, GET_BY_ID as getPolicyById } from '../../api/policies/route.js';
import { POST as createSalarySlip, GET as getSalarySlips, DELETE as deleteSalarySlip } from '../../api/salary-slips/route.js';
import { GET as getHolidays, POST as createHoliday, DELETE as deleteHoliday } from '../../api/holidays/route.js';
import { GET as getAnnouncements, POST as createAnnouncement, DELETE as deleteAnnouncement } from '../../api/announcements/route.js';
import * as adminPayrollGroupedRoute from '../../api/admin/payroll/grouped/route.js';

const router = Router();

router.get('/policies', authenticate, adminMock, asyncHandler(getPolicies));
router.get('/policies/:id', authenticate, adminMock, asyncHandler(getPolicyById));
router.post('/policies', authenticate, adminMock, asyncHandler(createPolicy));
router.delete('/policies/:id', authenticate, adminMock, asyncHandler(deletePolicy));

router.get('/salary-slips', authenticate, adminMock, asyncHandler(getSalarySlips));
router.post('/salary-slips', authenticate, adminMock, asyncHandler(createSalarySlip));
router.delete('/salary-slips/:id', authenticate, adminMock, asyncHandler(deleteSalarySlip));

router.get('/holidays', authenticate, adminMock, asyncHandler(getHolidays));
router.post('/holidays', authenticate, adminMock, asyncHandler(createHoliday));
router.delete('/holidays/:id', authenticate, adminMock, asyncHandler(deleteHoliday));

router.get('/announcements', authenticate, asyncHandler(getAnnouncements));
router.post('/announcements', authenticate, asyncHandler(createAnnouncement));
router.delete('/announcements/:id', authenticate, asyncHandler(deleteAnnouncement));

router.get('/admin/payroll/grouped', authenticate, adminMock, asyncHandler(adminPayrollGroupedRoute.GET));

export default router;
