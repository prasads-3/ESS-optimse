// Multipart upload endpoints. Logic moved verbatim from server.js. The tus
// resumable endpoints (/api/uploads*) are NOT here — they must be mounted before
// express.json and are wired directly in app.js for that reason.
import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import asyncHandler from '../utils/asyncHandler.js';
import { diskUpload, memoryUpload, documentUpload } from '../config/multer.js';
import { uploadObject } from '../../lib/minio.js';

const router = Router();

// Legacy upload route — writes to local disk at public/uploads/. Files do NOT
// survive redeploys on Docker-volume setups. Kept for backwards compatibility;
// new callers should use /api/upload/org-logo below.
router.post('/upload', diskUpload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
});

// Org-logo upload: pushes to MinIO (bucket set by MINIO_BUCKET). uploadObject
// falls back to writing under public/uploads/ if MinIO is unreachable.
router.post('/upload/org-logo', memoryUpload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const ext = req.file.mimetype === 'image/png' ? 'png' : 'jpg';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const objectKey = `org-logos/file-${uniqueSuffix}.${ext}`;

        const url = await uploadObject({
            objectKey,
            buffer: req.file.buffer,
            contentType: req.file.mimetype,
        });

        res.json({ url });
    } catch (err) {
        console.error('[upload/org-logo]', err);
        res.status(500).json({ error: 'Failed to save logo', details: err.message });
    }
});

// KYC/document upload (Aadhaar, PAN, Passport, etc.) — plain multipart upload.
// Mirrors the tus object-key scheme so stored URLs are interchangeable with the
// resumable flow. Returns { success, url }.
router.post('/upload-document', authenticate, documentUpload.single('document'), asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No document uploaded' });

    const sanitize = (s) => String(s || '').replace(/[^\w.\-]+/g, '_').slice(0, 120);
    const orgId = req.user?.organizationId ?? 'none';
    const folder = sanitize(req.body.folder) || 'employee-docs';
    const docType = sanitize(req.body.docType) || 'file';
    const safeName = sanitize(req.file.originalname) || 'file';

    const objectKey = `${folder}/org-${orgId}/${docType}-${Date.now()}-${safeName}`;
    const url = await uploadObject({
        objectKey,
        buffer: req.file.buffer,
        contentType: req.file.mimetype,
    });

    res.json({ success: true, url });
}));

export default router;
