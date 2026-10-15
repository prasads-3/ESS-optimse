// Organizations + Company. Thin-wraps the existing api/* handlers with the same
// guard chain (authenticate [+ adminMock for organizations]) used in server.js.
import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import adminMock from '../middleware/adminMock.js';
import asyncHandler from '../utils/asyncHandler.js';
import { memoryUpload } from '../config/multer.js';
import { GET as getOrganizations, POST as createOrganization, DELETE as deleteOrganization, PATCH as updateOrganization, RESET_PASSWORD as resetOrganizationAdminPassword } from '../../api/organizations/route.js';
import { GET as getCompany, PUT as putCompany, UPLOAD_LOGO as uploadCompanyLogo } from '../../api/company/route.js';

const router = Router();

router.get('/organizations', authenticate, adminMock, asyncHandler(getOrganizations));
router.post('/organizations', authenticate, adminMock, asyncHandler(createOrganization));
router.delete('/organizations/:id', authenticate, adminMock, asyncHandler(deleteOrganization));
router.patch('/organizations/:id', authenticate, adminMock, asyncHandler(updateOrganization));
router.post('/organizations/:id/reset-password', authenticate, adminMock, asyncHandler(resetOrganizationAdminPassword));

// Company (logo stored in MinIO)
router.get('/company', authenticate, asyncHandler(getCompany));
router.put('/company', authenticate, asyncHandler(putCompany));
router.post('/company/logo', authenticate, memoryUpload.single('file'), asyncHandler(uploadCompanyLogo));

export default router;
