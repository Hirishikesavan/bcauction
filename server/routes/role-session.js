const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getAuth, getDb } = require('../lib/auth');

// ── ROLE-BASED SESSION CREATION ─────────────────────────────────
// Creates a Better Auth session for role-based access without email/password
// This is used by the role selection page to establish a session
// Mounted at /api/role-session to avoid conflict with Better Auth's /api/auth/* routes
router.post('/create', async (req, res) => {
  try {
    const { role } = req.body;

    if (!role || !['organizer', 'team_owner', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be organizer, team_owner, or viewer.' });
    }

    // Generate a unique guest email for this session
    const guestId = crypto.randomBytes(16).toString('hex');
    const guestEmail = `guest-${guestId}@beastcricket.local`;

    console.log('[AUTH] Creating role-based session for:', role, 'guest email:', guestEmail);

    // Create user in Better Auth database
    const authInstance = getAuth();
    const db = getDb();

    // Check if user already exists
    let existingUser = await db.collection('user').findOne({ email: guestEmail });

    if (!existingUser) {
      // Create new user with selected role
      const newUser = {
        id: guestId,
        email: guestEmail,
        emailVerified: true,
        name: `${role.charAt(0).toUpperCase() + role.slice(1)} User`,
        role: role,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.collection('user').insertOne(newUser);
      console.log('[AUTH] Created new guest user:', guestId, 'role:', role);
    } else {
      // Update existing user's role
      await db.collection('user').updateOne(
        { email: guestEmail },
        { $set: { role: role, updatedAt: new Date() } }
      );
      console.log('[AUTH] Updated existing guest user role to:', role);
    }

    // Create Better Auth session using email/password sign-in with auto-signup
    // Since autoSignUpOnSignIn is enabled, this will create a session
    const sessionResult = await authInstance.api.signInEmail({
      body: {
        email: guestEmail,
        password: guestId, // Use guestId as password (will auto-signup)
      },
    });

    if (!sessionResult || !sessionResult.user) {
      console.error('[AUTH] Failed to create session for role:', role);
      return res.status(500).json({ error: 'Failed to create session' });
    }

    console.log('[AUTH] Session created successfully for role:', role);

    return res.json({
      success: true,
      user: sessionResult.user,
      session: sessionResult.session,
    });

  } catch (err) {
    console.error('[AUTH] Role session creation error:', err);
    return res.status(500).json({ error: 'Failed to create role session' });
  }
});

module.exports = router;
