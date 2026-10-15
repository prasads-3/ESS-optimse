// Money requests (employee side) + admin money-requests. Thin-wraps
// api/money-request and api/admin/money-requests.
import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import asyncHandler from '../utils/asyncHandler.js';
import * as moneyRequestRoute from '../../api/money-request/route.js';
import * as adminMoneyRequestsRoute from '../../api/admin/money-requests/route.js';
import * as approvalsRoute from '../../api/approvals/route.js';

const router = Router();

router.get('/money-request', authenticate, asyncHandler(moneyRequestRoute.GET));
router.post('/money-request', authenticate, asyncHandler(moneyRequestRoute.POST));

router.get('/admin/money-requests', authenticate, asyncHandler(adminMoneyRequestsRoute.GET));
router.patch('/admin/money-requests/:id', authenticate, asyncHandler(adminMoneyRequestsRoute.PATCH));

// Multi-level approval inbox — requests awaiting the logged-in user's decision.
router.get('/approvals', authenticate, asyncHandler(approvalsRoute.GET));

export default router;
