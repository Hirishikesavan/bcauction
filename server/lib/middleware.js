'use strict';
// Re-export from the canonical middleware — keeps server.js imports working
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { getAuth } = require('./auth');

// Global auth middleware — non-blocking session attachment
const { getDb } = require('./auth');

const authMiddleware = async (req, res, next) => {
  try {
    const authInstance = getAuth();
    const session = await authInstance.api.getSession({ headers: req.headers });
    if (session?.user) {
      req.user    = session.user;
      req.session = session.session;

      // CRITICAL FIX: normalize _id so all routes using req.user._id work.
      // Better Auth only provides req.user.id (string); _id is undefined without this.
      if (!req.user._id) req.user._id = req.user.id;

      // CRITICAL FIX: always read fresh role from DB (session cookie caches stale role)
      try {
        const db = getDb();
        if (db) {
          const dbUser = await db.collection('user').findOne(
            { id: req.user.id },
            { projection: { role: 1, isAdmin: 1 } }
          );
          if (dbUser?.role) req.user.role = dbUser.role;
          if (dbUser?.isAdmin) req.user.isAdmin = true;
        }
      } catch (dbErr) { /* non-fatal */ }

      // Enforce admin role for admin email (belt-and-suspenders)
      const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'hirishi2020@gmail.com').toLowerCase();
      if (req.user.email && req.user.email.toLowerCase() === ADMIN_EMAIL) {
        req.user.role    = 'admin';
        req.user.isAdmin = true;
        // Persist asynchronously using shared connection (no new MongoClient)
        try {
          const db = getDb();
          if (db) {
            db.collection('user').updateOne(
              { id: req.user.id },
              { $set: { role: 'admin', isAdmin: true } }
            ).catch(() => {});
          }
        } catch { /* ignore */ }
      }
    }
  } catch { /* silently ignore — unauthenticated requests pass through */ }
  return next();
};

const requireAuth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized — please login' });
  return next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (req.user.role !== 'admin' && !req.user.isAdmin)
    return res.status(403).json({ error: 'Admin access required' });
  return next();
};

module.exports = { authMiddleware, requireAuth, requireAdmin, authenticate, authorize, optionalAuth };
