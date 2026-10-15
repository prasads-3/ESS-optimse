// Central place for environment-derived config. `import 'dotenv/config'` runs in
// server.js BEFORE this module is imported, so process.env is already populated.
export const PORT = 3001;
export const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-this';

// CORS allow-list. Kept identical to the inline list previously in server.js.
export const ALLOWED_ORIGINS = [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:8081',
    'http://127.0.0.1:8081',
    'http://localhost:8082',
    'http://127.0.0.1:8082',
    'http://localhost:8083',
    'http://127.0.0.1:8083',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
    process.env.FRONTEND_URL,
    'http://localhost:4173',
    'https://ess.miraki.in',
    'http://ess.miraki.in',
    'http://57.128.246.185:8081',
    'http://57.128.246.185',
    'http://45.113.226.91:8082',
    'http://45.113.226.91:8081',
    'http://45.113.226.91:8080',
    'http://45.113.226.91:3001',
    'http://45.113.226.91',
].filter(Boolean);
