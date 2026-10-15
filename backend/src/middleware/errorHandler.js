// Global Express error handler — moved verbatim from server.js. Must be
// registered LAST (after all routes and the SPA fallback). Special-cases
// body-parser's payload-too-large error with a 413 + friendly message.
export default function errorHandler(err, req, res, next) {
    if (err.type === 'entity.too.large') {
        process.stderr.write(`\n--- PAYLOAD ERROR ---\nLimit: ${err.limit}\nActual: ${err.length || 'unknown'}\n--------------------\n`);
        return res.status(413).json({
            error: 'Payload Too Large',
            message: `The total size of your images/files is too big. Current limit is 200MB.`,
        });
    }
    console.error('Server Internal Error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
}
