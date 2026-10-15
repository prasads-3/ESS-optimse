// Backend entry point. Lives at backend/ root (pm2 `employee-be` runs with
// cwd=./backend, and `npm run server` → `node server.js`). Responsibilities:
// load env, build the app, create the HTTP server, initialize Socket.IO, listen.
//
// `dotenv/config` MUST be the first import so process.env is populated before
// any config module (src/config/env.js) reads it.
import 'dotenv/config';
import http from 'http';
import app from './src/app.js';
import { initSockets } from './src/sockets/index.js';
import { PORT } from './src/config/env.js';

const httpServer = http.createServer(app);

// Initialize Socket.IO (handshake auth + room joins + realtime setIO).
// Must run BEFORE listen() so io exists when the first request emits.
initSockets(httpServer);

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server (HTTP + Socket.IO) running on http://0.0.0.0:${PORT}`);
});
