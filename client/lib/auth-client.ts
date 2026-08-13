import { createAuthClient } from 'better-auth/react';

// Use the env var so this works in both dev and production.
// NEXT_PUBLIC_API_URL is e.g. "http://localhost:5000/api" or "https://backend.railway.app/api"
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api')
  .replace(/\/api$/, ''); // strip trailing /api → gives us the backend root

export const authClient = createAuthClient({
  baseURL: `${API_BASE}/api/auth`,

  fetchOptions: {
    credentials: 'include',
  },
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;

export default authClient;
