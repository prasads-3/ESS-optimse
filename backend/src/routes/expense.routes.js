// Expenses + admin grouped view. Thin-wraps api/expenses, api/expenses/[id],
// and api/admin/expenses/grouped.
import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import adminMock from '../middleware/adminMock.js';
import asyncHandler from '../utils/asyncHandler.js';
import * as personalExpensesRoute from '../../api/expenses/route.js';
import * as individualExpenseRoute from '../../api/expenses/[id]/route.js';
import * as adminExpensesGroupedRoute from '../../api/admin/expenses/grouped/route.js';

const router = Router();

router.post('/expenses', authenticate, adminMock, asyncHandler(personalExpensesRoute.POST));
router.get('/expenses', authenticate, adminMock, asyncHandler(personalExpensesRoute.GET));
router.patch('/expenses/:id', authenticate, adminMock, asyncHandler(individualExpenseRoute.PATCH));
router.put('/expenses/:id', authenticate, adminMock, asyncHandler(individualExpenseRoute.PUT));
router.delete('/expenses/:id', authenticate, adminMock, asyncHandler(individualExpenseRoute.DELETE));
router.get('/admin/expenses/grouped', authenticate, adminMock, asyncHandler(adminExpensesGroupedRoute.GET));

export default router;
