// Historical no-op. The original server.js kept `adminMockMiddleware` as a
// passthrough after the mock data layer was retired ("Database is now fully
// functional"). Preserved verbatim so the middleware chain on each route is
// byte-for-byte the same as before the refactor.
export default function adminMock(req, res, next) {
    next();
}
