const express = require('express');
const router = express.Router();

// ── ROLE-BASED SESSION CREATION ─────────────────────────────────
// NO-AUTH MODE - Disabled - return success without creating sessions
router.post('/create', async (req, res) => {
  try {
    const { role } = req.body;

    if (!role || !['organizer', 'team_owner', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be organizer, team_owner, or viewer.' });
    }

    console.log('[AUTH] No-auth mode - role session creation bypassed for:', role);

    // No-auth mode - return success without creating Better Auth session
    return res.json({
      success: true,
      user: {
        id: 'default-organizer',
        email: 'organizer@beastcricket.com',
        role: role,
        name: `${role.charAt(0).toUpperCase() + role.slice(1)} User`,
      },
      session: null,
    });
  } catch (err) {
    console.error('[AUTH] Role session creation error:', err);
    return res.status(500).json({ error: 'Failed to create role session' });
  }
});

module.exports = router;
