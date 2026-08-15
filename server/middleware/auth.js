'use strict';
// ═══════════════════════════════════════════════════════════════
// AUTH MIDDLEWARE — NO-AUTH MODE
// ═══════════════════════════════════════════════════════════════
// Completely bypasses Better Auth for production no-auth mode

/**
 * AUTHENTICATE — attaches default user without any Better Auth calls
 * NO-AUTH MODE: Pass through without blocking
 */
const authenticate = async (req, res, next) => {
  // No-auth mode - attach default user and pass through
  req.user = {
    id: 'default-organizer',
    _id: 'default-organizer',
    role: 'organizer',
    email: 'organizer@beastcricket.com'
  };
  console.log('[AUTH] No-auth mode - default user attached');
  return next();
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
 * NO-AUTH MODE: Attach default user without blocking
 */
const optionalAuth = async (req, res, next) => {
  try {
    // No-auth mode - attach default user
    req.user = {
      id: 'default-organizer',
      _id: 'default-organizer',
      role: 'organizer',
      email: 'organizer@beastcricket.com'
    };
    console.log('[AUTH] Optional auth - default user attached');
  } catch (err) {
    console.log('[AUTH] Optional auth error (non-fatal):', err.message);
  }
  return next();
};

module.exports = { authenticate, authorize, optionalAuth };
