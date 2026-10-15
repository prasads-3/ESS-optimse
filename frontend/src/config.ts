export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Public origin used when generating share-able links (org login URLs, etc.)
// Falls back to the browser's current origin for local dev.
export const PUBLIC_ORIGIN =
  (import.meta.env.VITE_PUBLIC_URL as string | undefined)?.replace(/\/$/, '') ||
  (typeof window !== 'undefined' ? window.location.origin : '');
