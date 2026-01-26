// config.ts
// Runtime-configurable API endpoint
// In production: uses current domain + /api
// In development: uses localhost:8000
export const NEXT_PUBLIC_API = (() => {
  // Check if we're in browser
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // If not localhost, use current domain + /api
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `${window.location.protocol}//${window.location.host}/api`;
    }
  }
  // Fallback to env variable or localhost for development
  return process.env.NEXT_PUBLIC_API || "http://localhost:8000";
})();
