// Auth for the tus upload endpoints. Identical logic to `authenticate`, but kept
// separate because it is mounted BEFORE express.json (so PATCH chunk bodies are
// not consumed by the body parser) and uses optional chaining on req.cookies
// since it runs in that earlier pipeline position. req.user is then available
// inside tus hooks for org-scoping object keys. Moved verbatim from server.js.
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';

export default function tusAuth(req, res, next) {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token' });
        req.user = user;
        next();
    });
}
