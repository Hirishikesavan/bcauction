'use strict';
// ═══════════════════════════════════════════════════════════════
// PROMOTE ROLE — keeps Better Auth's `user.role` in sync whenever
// an organizer assigns someone as a team owner.
//
// BUG THIS FIXES: every new account defaults to role "viewer".
// When an organizer created a team and picked an existing user as
// the owner, that user's `role` field was never updated — so when
// they tried to bid, authorize('team_owner') / the socket bid
// handler rejected them ("Permission denied... viewer... team_owner")
// and the live auction page hid the BID button because
// isTeamOwner (user.role === 'team_owner') was false.
// ═══════════════════════════════════════════════════════════════
const { getDb } = require('../lib/auth');
const mongoose = require('mongoose');

/**
 * Ensure the given user has role "team_owner" in the Better Auth
 * `user` collection. Never downgrades an admin or organizer.
 */
async function promoteToTeamOwner(ownerId) {
  if (!ownerId) return;
  try {
    const db = getDb();
    if (!db) return;
    const idStr = ownerId.toString();
    const filter = {
      $or: [
        { id: idStr },
        { _id: idStr },
        { _id: mongoose.Types.ObjectId.isValid(idStr) ? new mongoose.Types.ObjectId(idStr) : idStr },
      ],
    };
    const user = await db.collection('user').findOne(filter);
    if (!user) return;
    if (user.role === 'admin' || user.role === 'organizer') return; // never downgrade
    if (user.role === 'team_owner') return; // already correct

    await db.collection('user').updateOne(filter, { $set: { role: 'team_owner' } });
    console.log('✅ Promoted user to team_owner:', user.email || idStr);
  } catch (e) {
    console.error('❌ promoteToTeamOwner failed:', e.message);
  }
}

module.exports = { promoteToTeamOwner };
