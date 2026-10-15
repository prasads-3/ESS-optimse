import { Client as MinioClient } from 'minio';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const {
    MINIO_ENDPOINT = 'localhost',
    MINIO_PORT = '9000',
    MINIO_USE_SSL = 'false',
    MINIO_ACCESS_KEY,
    MINIO_SECRET_KEY,
    MINIO_BUCKET = 'assets',
    MINIO_PUBLIC_URL, // e.g. https://cdn.example.com  (no trailing slash). If unset, URL is derived from endpoint.
} = process.env;

export const BUCKET = MINIO_BUCKET;

// Only initialize MinIO if credentials are provided
const hasMinioCredentials = MINIO_ACCESS_KEY && MINIO_SECRET_KEY;

export const minio = hasMinioCredentials ? new MinioClient({
    endPoint: MINIO_ENDPOINT,
    port: parseInt(MINIO_PORT, 10),
    useSSL: String(MINIO_USE_SSL).toLowerCase() === 'true',
    accessKey: MINIO_ACCESS_KEY,
    secretKey: MINIO_SECRET_KEY,
}) : null;

const PUBLIC_READ_POLICY = (bucket) => ({
    Version: '2012-10-17',
    Statement: [
        {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucket}/*`],
        },
    ],
});

let bucketReady = null;

export async function ensureBucket() {
    if (!minio) throw new Error('MinIO client not initialized');
    if (bucketReady) return bucketReady;
    bucketReady = (async () => {
        const exists = await minio.bucketExists(BUCKET).catch(() => false);
        if (!exists) {
            await minio.makeBucket(BUCKET, 'us-east-1');
            console.log(`[MinIO] Created bucket "${BUCKET}"`);
        }
        await minio.setBucketPolicy(BUCKET, JSON.stringify(PUBLIC_READ_POLICY(BUCKET)));
    })();
    return bucketReady;
}

export function getPublicUrl(objectKey, isLocal = false) {
    if (isLocal) {
        return `/uploads/${objectKey}`;
    }
    if (MINIO_PUBLIC_URL) {
        return `${MINIO_PUBLIC_URL.replace(/\/$/, '')}/${BUCKET}/${objectKey}`;
    }
    const scheme = String(MINIO_USE_SSL).toLowerCase() === 'true' ? 'https' : 'http';
    const port = parseInt(MINIO_PORT, 10);
    const isDefault = (scheme === 'https' && port === 443) || (scheme === 'http' && port === 80);
    const host = isDefault ? MINIO_ENDPOINT : `${MINIO_ENDPOINT}:${port}`;
    return `${scheme}://${host}/${BUCKET}/${objectKey}`;
}

/**
 * Uploads an object to MinIO with an automatic local disk fallback.
 * This ensures that local development works even without a running MinIO server.
 */
/**
 * Persist an image field to MinIO and return its public URL.
 *
 * Accepts the value as stored/sent by the app. If it's a base64 data URL
 * (`data:<mime>;base64,...`) it is decoded and uploaded to MinIO (folder/docType
 * shape it into the object key), and the resulting public URL is returned. If
 * it's already a URL (http(s):// or /uploads/...), empty, or not a data URL, it
 * is returned unchanged — so this is safe to call on every save and is idempotent
 * (re-saving a record that already holds a URL is a no-op).
 *
 * Used both by the live create/update handlers and by the one-time migration of
 * existing base64 columns to object storage.
 */
export async function persistDataUrl(value, { folder = 'misc', docType = 'file' } = {}) {
    if (!value || typeof value !== 'string' || !value.startsWith('data:')) return value;

    const match = value.match(/^data:([^;]+);base64,(.+)$/s);
    if (!match) return value; // malformed / non-base64 data URL — leave as-is

    const contentType = match[1] || 'application/octet-stream';
    const buffer = Buffer.from(match[2], 'base64');
    const ext = (contentType.split('/')[1] || 'bin').split('+')[0].replace(/[^a-z0-9]/gi, '') || 'bin';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const objectKey = `${folder}/${docType}-${uniqueSuffix}.${ext}`;

    return uploadObject({ objectKey, buffer, contentType });
}

export async function uploadObject({ objectKey, buffer, contentType }) {
    try {
        if (!minio) throw new Error('No MinIO config');
        
        await ensureBucket();
        await minio.putObject(BUCKET, objectKey, buffer, buffer.length, {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400',
        });
        console.log(`[Storage] Uploaded "${objectKey}" to MinIO`);
        return getPublicUrl(objectKey);
    } catch (err) {
        console.warn(`[Storage] MinIO upload failed, falling back to local disk:`, err.message);
        
        // Local fallback logic
        const localRelativePath = path.join('uploads', objectKey);
        const localAbsolutePath = path.join(process.cwd(), 'public', localRelativePath);
        const localDir = path.dirname(localAbsolutePath);

        if (!fs.existsSync(localDir)) {
            fs.mkdirSync(localDir, { recursive: true });
        }

        fs.writeFileSync(localAbsolutePath, buffer);
        console.log(`[Storage] Saved "${objectKey}" to local disk: ${localAbsolutePath}`);

        // Return a relative URL that the express.static('public') will serve
        return `/uploads/${objectKey}`;
    }
}

/**
 * Recover the object key from a stored URL — works for both a MinIO public URL
 * (`.../<bucket>/<objectKey>`) and the local-disk fallback (`/uploads/<objectKey>`).
 * Returns null if the value isn't a recognizable stored-file URL.
 */
export function objectKeyFromUrl(url) {
    if (!url || typeof url !== 'string') return null;
    if (url.startsWith('/uploads/')) return decodeURIComponent(url.slice('/uploads/'.length));
    const marker = `/${BUCKET}/`;
    const i = url.indexOf(marker);
    if (i !== -1) return decodeURIComponent(url.slice(i + marker.length));
    return null;
}

/**
 * Delete a previously-stored file given its URL. Removes the MinIO object (or the
 * local-disk fallback file). Best-effort: logs and swallows errors so a failed
 * cleanup never blocks the main operation. No-op for non-stored values (e.g. an
 * old base64 blob or empty string).
 */
export async function removeObjectByUrl(url) {
    const objectKey = objectKeyFromUrl(url);
    if (!objectKey) return;
    try {
        if (minio) {
            await ensureBucket();
            await minio.removeObject(BUCKET, objectKey);
            console.log(`[Storage] Removed "${objectKey}" from MinIO`);
        } else {
            const localPath = path.join(process.cwd(), 'public', 'uploads', objectKey);
            if (fs.existsSync(localPath)) {
                fs.unlinkSync(localPath);
                console.log(`[Storage] Removed local file "${localPath}"`);
            }
        }
    } catch (err) {
        console.warn(`[Storage] removeObjectByUrl("${objectKey}") failed:`, err.message);
    }
}

/**
 * Upload a base64 data URL to a SPECIFIC object key (overwriting any existing
 * object at that key). Use this when the caller wants a stable, deterministic
 * key — e.g. one photo slot per employee — so re-uploads replace in place rather
 * than piling up duplicates. Returns the value unchanged if it isn't a data URL.
 */
export async function persistDataUrlAt(value, objectKey) {
    if (!value || typeof value !== 'string' || !value.startsWith('data:')) return value;
    const match = value.match(/^data:([^;]+);base64,(.+)$/s);
    if (!match) return value;
    const contentType = match[1] || 'application/octet-stream';
    const buffer = Buffer.from(match[2], 'base64');
    return uploadObject({ objectKey, buffer, contentType });
}

/** Pick a file extension from a content type (defaults to bin). */
export function extFromContentType(contentType) {
    return (contentType.split('/')[1] || 'bin').split('+')[0].replace(/[^a-z0-9]/gi, '') || 'bin';
}

