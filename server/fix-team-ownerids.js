// ════════════════════════════════════════════════════════════════════════════
// FIX TEAM OWNERID TYPES - Migration Script
// ════════════════════════════════════════════════════════════════════════════
// This script fixes teams that have ownerId stored as strings instead of ObjectIds
// Run this after updating the code to use ObjectId for ownerId
// ════════════════════════════════════════════════════════════════════════════

require('dotenv').config();
const mongoose = require('mongoose');
const Team = require('./models/Team');

async function fixTeamOwnerIds() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/beast-cricket');
    console.log('✅ Connected to MongoDB');

    // Find all teams
    const teams = await Team.find({});
    console.log(`📋 Found ${teams.length} teams in database`);

    let fixedCount = 0;
    let alreadyCorrectCount = 0;
    let nullOwnerCount = 0;

    for (const team of teams) {
      console.log(`\n🔍 Checking team: ${team.name} (${team._id})`);
      console.log(`   Current ownerId: ${team.ownerId}`);
      console.log(`   ownerId type: ${typeof team.ownerId}`);

      // Skip if ownerId is null (organizer-created teams)
      if (!team.ownerId) {
        console.log('   ⚠️  ownerId is null - skipping (organizer-created team)');
        nullOwnerCount++;
        continue;
      }

      // Check if ownerId is a string (incorrect) or ObjectId (correct)
      if (typeof team.ownerId === 'string') {
        console.log('   ❌ ownerId is string - converting to ObjectId');
        
        // Convert string to ObjectId
        try {
          const objectId = new mongoose.Types.ObjectId(team.ownerId);
          team.ownerId = objectId;
          await team.save();
          console.log('   ✅ Fixed ownerId to ObjectId');
          fixedCount++;
        } catch (err) {
          console.log('   ❌ Failed to convert to ObjectId:', err.message);
        }
      } else if (team.ownerId instanceof mongoose.Types.ObjectId) {
        console.log('   ✅ ownerId is already ObjectId - no change needed');
        alreadyCorrectCount++;
      } else {
        console.log('   ⚠️  ownerId has unexpected type:', typeof team.ownerId);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 SUMMARY:');
    console.log(`   Total teams: ${teams.length}`);
    console.log(`   Fixed: ${fixedCount}`);
    console.log(`   Already correct: ${alreadyCorrectCount}`);
    console.log(`   Null ownerId (organizer teams): ${nullOwnerCount}`);
    console.log('═══════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

fixTeamOwnerIds();
