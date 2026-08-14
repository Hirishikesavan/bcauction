'use strict';
// ═══════════════════════════════════════════════════════════════
// AUTH MIDDLEWARE — CANONICAL BETTER AUTH IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════
// Uses the real Better Auth instance as single source of truth
// No fake users, no hardcoded IDs, proper session validation

const { getAuth } = require('../lib/auth');

/**
 * AUTHENTICATE — validates Better Auth session and attaches user
 */
const authenticate = async (req, res, next) => {
  try {
    const authInstance = getAuth();
    const session = await authInstance.api.getSession({ headers: req.headers });

    if (session?.user) {
      req.user = session.user;
      req.session = session.session;
      // Normalize _id field
      if (!req.user._id) {
        req.user._id = req.user.id;
      }
      console.log('[AUTH] Authenticated user:', req.user.id, 'role:', req.user.role);
      return next();
    }

    // No valid session - return 401
    console.log('[AUTH] No valid session found');
    return res.status(401).json({ error: 'Invalid Session' });
  } catch (err) {
    console.error('[AUTH] Authentication error:', err.message);
    return res.status(401).json({ error: 'Invalid Session' });
  }
};

/**
 * AUTHORIZE — checks role after authenticate has run
 */
const authorize = (...roles) => (req, res, next) => {
  const userRole = req.user?.role;

  if (!userRole) {
    return res.status(403).json({
      error: 'Permission denied. No role found.',
    });
  }

  // Check if user's role is in the allowed roles
  if (roles.includes(userRole)) {
    return next();
  }

  return res.status(403).json({
    error: `Permission denied. You are logged in as "${userRole}". Required: ${roles.join(' or ')}.`,
  });
};

/**
 * OPTIONAL AUTH — attaches user if session exists, never blocks
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authInstance = getAuth();
    const session = await authInstance.api.getSession({ headers: req.headers });
    if (session?.user) {
      req.user = session.user;
      req.session = session.session;
      req.user._id = req.user._id || req.user.id;
      console.log('[AUTH] Optional auth - user:', req.user.id, 'role:', req.user.role);
    }
  } catch (err) {
    console.log('[AUTH] Optional auth - no session (this is fine)');
  }
  return next();
};

module.exports = { authenticate, authorize, optionalAuth };
