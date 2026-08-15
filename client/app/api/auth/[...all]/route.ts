/**
 * NO-AUTH MODE - Better Auth proxy disabled
 * All /api/auth/* calls now return success without backend forwarding
 */
import { NextRequest, NextResponse } from 'next/server';

async function handler(req: NextRequest) {
  // No-auth mode - return success for all auth requests
  return NextResponse.json({ success: true, message: 'No-auth mode - authentication disabled' });
}

export const GET    = handler;
export const POST   = handler;
export const PUT    = handler;
export const DELETE = handler;
export const PATCH  = handler;

export const dynamic = 'force-dynamic';
