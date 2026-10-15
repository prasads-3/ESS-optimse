// Builds and exports the Express app (no listen — server.js owns the HTTP server
// and Socket.IO). The middleware order below is LOAD-BEARING and mirrors the
// original server.js exactly:
//   compression → requestLogger → cors → cookieParser
//   → tus mount (BEFORE express.json, so PATCH chunk bodies survive)
//   → express.json/urlencoded → health → static(public) → static(dist)
//   → /api routes → SPA fallback → error handler (LAST).
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import path from 'path';
import fs from 'fs';

import prisma from '../lib/prisma.js';
import { corsOptions } from './config/cors.js';
import { tusServer } from './config/tus.js';
import requestLogger from './middleware/requestLogger.js';
import tusAuth from './middleware/tusAuth.js';
import errorHandler from './middleware/errorHandler.js';
import apiRoutes from './routes/index.js';

const app = express();

// Gzip-compress all responses (static assets + JSON). Largest win on /admin
// initial paint: vendor chunks drop from ~270 KB raw → ~80 KB on the wire.
app.use(compression());

app.use(requestLogger);

app.use(cors(corsOptions));

app.use(cookieParser());

// Tus resumable uploads — must be mounted BEFORE express.json so PATCH chunk
// bodies aren't consumed by the body parser. Auth runs inline; req.user is then
// available inside tus hooks for org-scoping object keys.
app.all('/api/uploads', tusAuth, (req, res) => tusServer.handle(req, res));
app.all('/api/uploads/*', tusAuth, (req, res) => tusServer.handle(req, res));

app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

// Health probe — verifies the process is up AND the DB is reachable.
// Used by the Jenkins health-check stage and uptime monitoring.
app.get('/api/health', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.status(200).json({ status: 'ok', db: 'up' });
    } catch (err) {
        res.status(503).json({ status: 'error', db: 'down', message: err.message });
    }
});

app.use(express.static('public'));
// Vite emits content-hashed filenames under dist/assets, so they can be cached
// forever. index.html references those hashes and must NOT be cached, or clients
// would pin an old build after a deploy. compression() above gzips them on the fly.
app.use(express.static('dist', {
    maxAge: '1y',
    immutable: true,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    },
}));

// All /api routes (employees [MVC], auth, organizations, leaves, expenses,
// attendance, referrals, dashboard, hr, money, super-admin, uploads, tasks).
app.use('/api', apiRoutes);

// SPA fallback — serve index.html for any non-API route so client-side routing works
app.get('*', (req, res) => {
    // Skip API routes and static files that already have extensions (like .js, .css, .png)
    if (req.path.startsWith('/api/') || path.extname(req.path)) {
        return res.status(404).json({ error: 'Not Found' });
    }

    // Serve index.html from dist folder
    res.sendFile(path.resolve('dist', 'index.html'), (err) => {
        if (err) {
            // Fallback for development if dist doesn't exist yet
            const publicIndex = path.resolve('public', 'index.html');
            if (fs.existsSync(publicIndex)) {
                res.sendFile(publicIndex);
            } else {
                res.status(404).send('index.html not found');
            }
        }
    });
});

// Error handling middleware — must be registered last.
app.use(errorHandler);

export default app;
