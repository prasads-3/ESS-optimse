// The tus resumable-upload server is configured in lib/tus-server.js. Re-export
// it here so the config layer is the single import surface for route modules.
export { tusServer } from '../../lib/tus-server.js';
