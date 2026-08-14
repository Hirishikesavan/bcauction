'use strict';
// ═══════════════════════════════════════════════════════════════
// AUTH MIDDLEWARE — DISABLED FOR FREE UNLOCKED PLATFORM
// ═══════════════════════════════════════════════════════════════
// Beast Cricket now operates as a completely free, fully unlocked platform
// Authentication removed - role-based access via frontend role selection

/**
 * AUTHENTICATE — DISABLED - passes through with default organizer role
 * 
 * Since authentication is removed, we set a default user with organizer role
 * to allow auction creation and all other operations.
 * NO getSession call - this was causing "Invalid Session" errors
 */
const authenticate = async (req, res, next) => {
  // Always set default organizer user - no authentication checks
  req.user = {
    id: 'default-organizer',
    _id: 'default-organizer',
    role: 'organizer',
    email: 'organizer@beastcricket.com'
  };
  return next();
};

/**
 * AUTHORIZE — checks role after authenticate has run.
 * For free platform, if user has organizer role, allow access to organizer/admin routes.
 */
const authorize = (...roles) => (req, res, next) => {
  const userRole = req.user?.role || 'organizer'; // Default to organizer
  
  // For free platform, organizer role can access both organizer and admin routes
  if (userRole === 'organizer' && (roles.includes('organizer') || roles.includes('admin'))) {
    return next();
  }
  
  if (userRole === 'admin' && roles.includes('admin')) {
    return next();
  }
  
  // Allow team_owner for team owner routes
  if (userRole === 'team_owner' && roles.includes('team_owner')) {
    return next();
  }
  
  // If no specific role requirement, allow through for free platform
  if (!roles || roles.length === 0) {
    return next();
  }
  
  return res.status(403).json({
    error: `Permission denied. You are logged in as "${userRole || 'unknown'}". Required: ${roles.join(' or ')}.`,
  });
};

/**
 * OPTIONAL AUTH — attaches user if session exists, never blocks.
 */
const optionalAuth = async (req, res, next) => {
  // Always set default organizer for free platform
  req.user = {
    id: 'default-organizer',
    _id: 'default-organizer',
    role: 'organizer',
    email: 'organizer@beastcricket.com'
  };
  return next();
};

module.exports = { authenticate, authorize, optionalAuth };
