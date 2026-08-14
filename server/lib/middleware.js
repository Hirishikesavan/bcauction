'use strict';
// Authentication removed - middleware now passes through without auth checks

const authMiddleware = async (req, res, next) => {
  // No authentication - pass through
  return next();
};

const requireAuth = (req, res, next) => {
  // No authentication required - pass through
  return next();
};

const requireAdmin = (req, res, next) => {
  // No authentication required - pass through
  return next();
};

module.exports = { authMiddleware, requireAuth, requireAdmin };
