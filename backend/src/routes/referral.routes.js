// Referrals. Thin-wraps api/referrals and api/referrals/[id].
import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import asyncHandler from '../utils/asyncHandler.js';
import * as referralsRoute from '../../api/referrals/route.js';
import * as referralIdRoute from '../../api/referrals/[id]/route.js';

const router = Router();

router.get('/referrals', authenticate, asyncHandler(referralsRoute.GET));
router.post('/referrals', authenticate, asyncHandler(referralsRoute.POST));
router.patch('/referrals/:id', authenticate, asyncHandler(referralIdRoute.PATCH));
router.delete('/referrals/:id', authenticate, asyncHandler(referralIdRoute.DELETE));

export default router;
