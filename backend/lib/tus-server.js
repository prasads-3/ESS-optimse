import { Server } from '@tus/server';
import { FileStore } from '@tus/file-store';
import fs from 'fs';
import path from 'path';
import { uploadObject } from './minio.js';

const TUS_TMP_DIR = path.join(process.cwd(), 'uploads-tmp');
if (!fs.existsSync(TUS_TMP_DIR)) fs.mkdirSync(TUS_TMP_DIR, { recursive: true });

const sanitize = (s) => String(s || '').replace(/[^\w.\-]+/g, '_').slice(0, 120);

export const tusServer = new Server({
    path: '/api/uploads',
    datastore: new FileStore({ directory: TUS_TMP_DIR }),

    async onIncomingRequest(req) {
        if (!req.user) {
            throw { status_code: 401, body: 'Authentication required' };
        }
    },

    async onUploadFinish(req, res, upload) {
        const tmpPath = path.join(TUS_TMP_DIR, upload.id);
        const sidecar = `${tmpPath}.json`;
        try {
            const meta = upload.metadata || {};
            const orgId = req.user?.organizationId ?? 'none';
            const folder = sanitize(meta.folder) || 'employee-docs';
            const docType = sanitize(meta.docType) || 'file';
            const safeName = sanitize(meta.filename) || upload.id;
            const contentType = meta.filetype || 'application/octet-stream';

            const objectKey = `${folder}/org-${orgId}/${docType}-${Date.now()}-${safeName}`;
            const buffer = await fs.promises.readFile(tmpPath);
            const publicUrl = await uploadObject({ objectKey, buffer, contentType });

            await fs.promises.unlink(tmpPath).catch(() => {});
            await fs.promises.unlink(sidecar).catch(() => {});

            return {
                res,
                status_code: 200,
                headers: { 'X-Final-Url': publicUrl },
            };
        } catch (err) {
            console.error('[tus] onUploadFinish error:', err);
            throw err;
        }
    },
});
