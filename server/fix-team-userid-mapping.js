// ════════════════════════════════════════════════════════════════════════════
// FIX TEAM USERID MAPPING - Migration Script
// ════════════════════════════════════════════════════════════════════════════
// This script checks if team.ownerId values match the corresponding user.id values
// from better-auth (which uses 'id' field, not '_id')
// Run this after updating the code to use req.user.id instead of req.user._id
// ════════════════════════════════════════════════════════════════════════════

require('dotenv').config();
const mongoose = require('mongoose');
const Team = require('./models/Team');
const User = require('./models/User');

async function fixTeamUserIdMapping() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/beast-cricket');
    console.log('✅ Connected to MongoDB');

    // Find all teams with non-null ownerId
    const teams = await Team.find({ ownerId: { $ne: null } });
    console.log(`📋 Found ${teams.length} teams with ownerId`);

    let mismatchCount = 0;
    let alreadyCorrectCount = 0;
    let userNotFoundCount = 0;

    for (const team of teams) {
      console.log(`\n🔍 Checking team: ${team.name} (${team._id})`);
      console.log(`   Team ownerId: ${team.ownerId} (type: ${typeof team.ownerId})`);

      // Try to find user by both 'id' and '_id' fields
      const userById = await User.findOne({ id: team.ownerId.toString() });
      const userBy_id = await User.findOne({ _id: team.ownerId });

      console.log(`   User found by 'id': ${userById ? userById.email : 'none'}`);
      console.log(`   User found by '_id': ${userBy_id ? userBy_id.email : 'none'}`);

      if (userById && !userBy_id) {
        // Team ownerId matches user.id but not user._id - need to update
        console.log('   ⚠️  Mismatch: ownerId matches user.id but not user._id');
        console.log(`   🔧 Updating ownerId from ${team.ownerId} to ${userById._id}`);
        
        team.ownerId = userById._id;
        await team.save();
        console.log('   ✅ Fixed ownerId to match user._id');
        mismatchCount++;
      } else if (userBy_id) {
        // Team ownerId already matches user._id - correct
        console.log('   ✅ ownerId already matches user._id - no change needed');
        alreadyCorrectCount++;
      } else {
        // No user found - orphaned team
        console.log('   ❌ No user found - orphaned team');
        userNotFoundCount++;
      }
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 SUMMARY:');
    console.log(`   Total teams checked: ${teams.length}`);
    console.log(`   Fixed (id → _id): ${mismatchCount}`);
    console.log(`   Already correct: ${alreadyCorrectCount}`);
    console.log(`   Orphaned (no user): ${userNotFoundCount}`);
    console.log('═══════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

fixTeamUserIdMapping();
