// Socket.IO setup — moved verbatim from server.js. Creates the io server bound
// to the given httpServer, authenticates the handshake via the same cookie JWT
// used for HTTP, joins per-user and per-org admin rooms on connection, and wires
// io into the realtime singleton (setIO) so feature controllers can emit events.
//
// ORDERING IS LOAD-BEARING: server.js must call initSockets(httpServer) BEFORE
// httpServer.listen() so io exists and setIO() has run by the time requests
// (which may emit) arrive.
import { Server as SocketIOServer } from 'socket.io';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { setIO, userRoom, adminsRoom } from '../../lib/realtime.js';
import { socketOptions } from '../config/socket.js';
import { JWT_SECRET } from '../config/env.js';
import { ADMIN_ROLES } from '../utils/constants.js';

export function initSockets(httpServer) {
    const io = new SocketIOServer(httpServer, socketOptions);

    // JWT auth over the cookie set at login. Reject if missing/invalid.
    io.use((socket, next) => {
        try {
            const raw = socket.handshake.headers.cookie || '';
            const parsed = cookie.parse(raw);
            const token = parsed.token;
            if (!token) return next(new Error('Authentication required'));
            jwt.verify(token, JWT_SECRET, (err, user) => {
                if (err) return next(new Error('Invalid or expired token'));
                socket.data.user = user;
                next();
            });
        } catch (e) {
            next(new Error('Auth failed'));
        }
    });

    io.on('connection', (socket) => {
        const u = socket.data.user || {};
        if (u.email) socket.join(userRoom(u.email));
        if (ADMIN_ROLES.includes(u.role)) {
            socket.join(adminsRoom(u.organizationId));
        }
        socket.emit('hello', { ok: true, email: u.email, role: u.role });
    });

    setIO(io);
    return io;
}
