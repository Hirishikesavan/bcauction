'use strict';
// ═══════════════════════════════════════════════════════════════
// AUTH MIDDLEWARE — Better Auth Sessions (NO JWT)
// ═══════════════════════════════════════════════════════════════
const { getAuth } = require('../lib/auth');
const { getDb }   = require('../lib/auth');

/**
 * AUTHENTICATE — reads Better Auth session cookie, attaches req.user
 *
 * KEY FIXES:
 * 1. Always re-fetches role from DB (not just when viewer) — fixes stale role
 *    after role change (e.g. team_owner → organizer).
 * 2. Sets req.user._id = req.user.id so all Mongoose queries using _id work.
 *    Better Auth only provides req.user.id (string); Mongoose OrganizerPackage
 *    uses organizerId which was being called with req.user._id = undefined.
 * 3. AUTO-PROMOTES users with active packages to organizer — prevents the
 *    "Permission denied. You are logged in as team_owner" error when admin
 *    grants a package without the user going through select-role again.
 */
const authenticate = async (req, res, next) => {
  try {
    const authInstance = getAuth();
    const session = await authInstance.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return res.status(401).json({ error: 'Login required. Please sign in.' });
    }

    req.user    = session.user;
    req.session = session.session;

    // ── CRITICAL FIX: normalize _id so all routes work ────────────────────
    if (!req.user._id) {
      req.user._id = req.user.id;
    }

    // ── CRITICAL FIX: ALWAYS refresh role from DB — unconditionally ───────
    try {
      const db = getDb();
      const dbUser = await db.collection('user').findOne(
        { id: req.user.id },
        { projection: { role: 1, isAdmin: 1 } }
      );
      if (dbUser?.role) {
        if (dbUser.role !== req.user.role) {
          console.log(`  ✅ Role refreshed: ${req.user.role} → ${dbUser.role} for ${req.user.email}`);
        }
        // ALWAYS set role from DB — never trust the session cookie role
        req.user.role = dbUser.role;
      }
      if (dbUser?.isAdmin) {
        req.user.isAdmin = true;
      }

      // ── AUTO-PROMOTE: If user has active package but role is not organizer/admin ──
      // This handles the case where admin grants a package to a team_owner or viewer
      // without the user going through select-role. Package ownership implies organizer role.
      if (req.user.role !== 'admin' && req.user.role !== 'organizer') {
        try {
          const OrganizerPackage = require('../models/OrganizerPackage');
          const now = new Date();
          const activePkg = await OrganizerPackage.findOne({
            $or: [{ organizerId: req.user.id }, { organizerId: String(req.user._id) }],
            expiresAt: { $gt: now },
          });
          if (activePkg) {
            console.log(`  🔄 Auto-promoting ${req.user.email} from ${req.user.role} → organizer (has active package)`);
            await db.collection('user').updateOne(
              { id: req.user.id },
              { $set: { role: 'organizer' } }
            );
            req.user.role = 'organizer';
            // Also update via Better Auth API for session consistency (non-fatal)
            try {
              await authInstance.api.updateUser({ userId: req.user.id, updates: { role: 'organizer' } });
            } catch (e) { /* non-fatal */ }
          }
        } catch (promoteErr) {
          console.warn('  ⚠️ Auto-promote check failed (non-fatal):', promoteErr.message);
        }
      }
    } catch (roleErr) {
      console.warn('  ⚠️ DB role refresh failed:', roleErr.message);
      // Continue with session role — don't block the request
    }

    return next();
  } catch (err) {
    console.error('❌ authenticate error:', err.message);
    return res.status(401).json({ error: 'Invalid session. Please sign in again.' });
  }
};

/**
 * AUTHORIZE — checks role after authenticate has run.
 */
const authorize = (...roles) => (req, res, next) => {
  const userRole = req.user?.role;
  if (!userRole || !roles.includes(userRole)) {
    return res.status(403).json({
      error: `Permission denied. You are logged in as "${userRole || 'unknown'}". Required: ${roles.join(' or ')}.`,
    });
  }
  return next();
};

/**
 * OPTIONAL AUTH — attaches user if session exists, never blocks.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authInstance = getAuth();
    const session = await authInstance.api.getSession({ headers: req.headers });
    if (session?.user) {
      req.user       = session.user;
      req.session    = session.session;
      req.user._id   = req.user._id || req.user.id;

      // Refresh role from DB for optional auth too
      try {
        const db = getDb();
        const dbUser = await db.collection('user').findOne(
          { id: req.user.id },
          { projection: { role: 1 } }
        );
        if (dbUser?.role) req.user.role = dbUser.role;
      } catch { /* ignore */ }
    }
  } catch { /* anonymous is fine */ }
  return next();
};

module.exports = { authenticate, authorize, optionalAuth };
