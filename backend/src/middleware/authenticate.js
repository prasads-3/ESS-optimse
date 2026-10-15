// Cookie-JWT auth — moved verbatim from server.js (`authenticateToken`).
// Reads the `token` cookie (cookie-parser must run before this), verifies it,
// and attaches the decoded payload to req.user.
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';

export default function authenticate(req, res, next) {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token' });
        req.user = user;
        next();
    });
}
