'use strict';
// Run once to fix EXISTING teams created before the promoteToTeamOwner fix:
//   node server/scripts/fix-team-owner-roles.js
require('dotenv').config();
const mongoose = require('mongoose');
const { initAuth, getDb } = require('../lib/auth');
const Team = require('../models/Team');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await initAuth();
  const db = getDb();

  const teams = await Team.find({ ownerId: { $ne: null } }).select('ownerId name');
  let fixed = 0;
  for (const t of teams) {
    const idStr = t.ownerId.toString();
    const filter = { $or: [{ id: idStr }, { _id: idStr }] };
    const user = await db.collection('user').findOne(filter);
    if (!user) { console.log('⚠️  No user for team', t.name, idStr); continue; }
    if (user.role === 'admin' || user.role === 'organizer' || user.role === 'team_owner') continue;
    await db.collection('user').updateOne(filter, { $set: { role: 'team_owner' } });
    console.log('✅ Fixed', user.email, '->', t.name);
    fixed++;
  }
  console.log(`Done. Fixed ${fixed}/${teams.length} team owner accounts.`);
  process.exit(0);
})();
