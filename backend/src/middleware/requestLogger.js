// Request logger — moved verbatim from server.js. Logs timestamp/method/url and
// the Origin header on every request.
export default function requestLogger(req, res, next) {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Origin:', req.headers.origin);
    next();
}
