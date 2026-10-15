// Wraps an async route handler so any rejection is caught and turned into a
// JSON 500 instead of crashing the process. Extracted verbatim from the
// `handle()` helper that lived in server.js — same log format, same body shape.
export default function asyncHandler(fn) {
    return (req, res) => {
        fn(req, res).catch((err) => {
            console.error(`[HANDLE-ERR] ${req.method} ${req.originalUrl}:`, err);
            res.status(500).json({
                error: err.message,
                code: err.code,
                url: req.originalUrl,
            });
        });
    };
}
