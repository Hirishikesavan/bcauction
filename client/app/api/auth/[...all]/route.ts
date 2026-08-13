/**
 * Better Auth proxy — forwards all /api/auth/* calls to the Express backend
 * where Better Auth runs (with MongoDB adapter, Google OAuth, email, etc.)
 *
 * FIX (Chrome account_not_linked):
 * - Do NOT follow redirects automatically for OAuth callback — let the browser handle them
 * - Properly forward Set-Cookie headers so Chrome accepts them
 * - Strip content-encoding to avoid decompression issues
 */
import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

async function handler(req: NextRequest) {
  const path    = req.nextUrl.pathname; // e.g. /api/auth/sign-in/email
  const search  = req.nextUrl.search;
  const target  = `${BACKEND}${path}${search}`;

  try {
    const headers = new Headers(req.headers);
    headers.delete('host');

    const body = req.method !== 'GET' && req.method !== 'HEAD'
      ? await req.arrayBuffer()
      : undefined;

    // FIX: Do NOT follow redirects for OAuth callback routes.
    // When Chrome follows a redirect from the OAuth callback, cookies set
    // on the first response may be dropped. By using 'manual', we return
    // the redirect response directly to the browser, which then follows
    // it natively and preserves cookies.
    const isOAuthCallback = path.includes('/callback/') || path.includes('/oauth/');
    
    const res = await fetch(target, {
      method:  req.method,
      headers,
      body,
      redirect: isOAuthCallback ? 'manual' : 'follow',
      credentials: 'include',
    });

    const resHeaders = new Headers(res.headers);
    // CRITICAL: Remove content-encoding so Next.js doesn't try to
    // decompress an already-decompressed body.
    resHeaders.delete('content-encoding');
    resHeaders.delete('content-length');

    // FIX for Chrome: Ensure cookies from OAuth callback are forwarded
    // with proper SameSite/Secure attributes that Chrome accepts.
    // The backend sets these correctly; we must pass them through verbatim.

    // For OAuth redirects (3xx), forward the Location header + cookies
    if (isOAuthCallback && res.status >= 300 && res.status < 400) {
      return new NextResponse(null, {
        status:  res.status,
        headers: resHeaders,
      });
    }

    return new NextResponse(res.body, {
      status:  res.status,
      headers: resHeaders,
    });
  } catch (err: any) {
    console.error('[auth proxy error]', err.message);
    return NextResponse.json({ error: 'Auth service unavailable' }, { status: 503 });
  }
}

export const GET    = handler;
export const POST   = handler;
export const PUT    = handler;
export const DELETE = handler;
export const PATCH  = handler;

export const dynamic = 'force-dynamic';
