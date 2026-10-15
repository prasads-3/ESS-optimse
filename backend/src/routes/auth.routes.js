// Auth + login-page public endpoints. Mounted at /api.
import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import asyncHandler from '../utils/asyncHandler.js';
import * as authCtrl from '../controllers/auth.controller.js';
import * as loginRoute from '../../api/login/route.js';
import { GENERATE_PASSWORD, FORGOT_PASSWORD, RESET_PASSWORD, CHANGE_PASSWORD, FORGOT_CHANGE_PASSWORD } from '../../api/auth/route.js';

const router = Router();

router.post('/login', asyncHandler(loginRoute.POST));

// Public org-branding lookups (no auth). Order matters: /org/by-email MUST be
// registered BEFORE /org/:slug, otherwise Express matches "by-email" as a
// :slug param and the by-email handler never runs (login-page org lookup breaks).
router.get('/org/by-email', asyncHandler(authCtrl.orgByEmail));
router.get('/org/:slug', asyncHandler(authCtrl.orgBySlug));
router.get('/org/:id/logo', asyncHandler(authCtrl.orgLogoById));

router.get('/auth/me', authenticate, asyncHandler(authCtrl.me));
router.post('/auth/logout', authenticate, asyncHandler(authCtrl.logout));

router.post('/auth/generate-password', authenticate, asyncHandler(GENERATE_PASSWORD));
router.post('/auth/forgot-password', asyncHandler(FORGOT_PASSWORD));
router.post('/auth/reset-password', asyncHandler(RESET_PASSWORD));
router.post('/auth/change-password', authenticate, asyncHandler(CHANGE_PASSWORD));
router.post('/auth/forgot-change-password', asyncHandler(FORGOT_CHANGE_PASSWORD));

export default router;
