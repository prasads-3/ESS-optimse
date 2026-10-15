// CORS options object — moved verbatim from server.js. The exposed/allowed
// headers include the tus resumable-upload headers, which are required for the
// /api/uploads flow to work cross-origin.
import { ALLOWED_ORIGINS } from './env.js';

export const corsOptions = {
    origin: ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
        'Content-Type', 'Authorization', 'Cookie',
        'Tus-Resumable', 'Upload-Length', 'Upload-Offset', 'Upload-Metadata',
        'Upload-Defer-Length', 'Upload-Concat', 'X-Requested-With',
    ],
    exposedHeaders: [
        'Location', 'Upload-Offset', 'Upload-Length', 'Tus-Version',
        'Tus-Resumable', 'Tus-Max-Size', 'Tus-Extension', 'Upload-Metadata',
        'X-Final-Url',
    ],
};
