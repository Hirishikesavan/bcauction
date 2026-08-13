import axios from 'axios';

// ─── JWT Token helpers kept for backward compat but NOT sent to server ────
// The server now uses Better Auth session cookies (withCredentials: true)
export const saveToken = (_t: string) => { /* no-op — server uses cookies */ };
export const getToken  = (): string  => '';
export const clearToken = () => { /* no-op */ };

const BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000')
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');  // strip trailing /api — we add it in baseURL below

/**
 * Resolve a player/team image URL.
 * - Cloudinary / external URLs → returned as-is
 * - Local /uploads/ paths → prepend the backend base URL
 */
export const imgUrl = (src?: string | null): string => {
  if (!src) return '';
  if (src.startsWith('http')) return src;
  return `${BASE}${src.startsWith('/') ? '' : '/'}${src}`;
};

const api = axios.create({
  baseURL:         `${BASE}/api`,
  withCredentials: true,   // send Better Auth session cookie cross-origin
  timeout:         30000,
});

api.interceptors.request.use((config) => {
  // DO NOT add Authorization header — we use HttpOnly session cookies
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  } else if (!config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      const p = window.location.pathname;
      const pub = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password', '/auctions'];
      if (!pub.some(pp => p.startsWith(pp)) && p !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
