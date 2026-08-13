// ════════════════════════════════════════════════════════════════════════════
// DELETE ORGANIZER-CREATED TEAMS - Cleanup Script
// ════════════════════════════════════════════════════════════════════════════
// This script deletes organizer-created teams (ownerId: null) to allow team owners
// to self-register and create their own teams
// ════════════════════════════════════════════════════════════════════════════

require('dotenv').config();
const mongoose = require('mongoose');
const Team = require('./models/Team');

async function deleteOrganizerTeams() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/beast-cricket');
    console.log('✅ Connected to MongoDB');

    // Find all organizer-created teams (ownerId: null)
    const organizerTeams = await Team.find({ ownerId: null });
    console.log(`\n📋 Found ${organizerTeams.length} organizer-created teams:\n`);

    for (const team of organizerTeams) {
      console.log(`🏆 Team: ${team.name}`);
      console.log(`   _id: ${team._id}`);
      console.log(`   auctionId: ${team.auctionId}`);
      console.log(`   ownerId: ${team.ownerId} (organizer-created)`);
    }

    if (organizerTeams.length === 0) {
      console.log('\n✅ No organizer-created teams found. Nothing to delete.');
      return;
    }

    // Ask for confirmation
    console.log('\n⚠️  WARNING: This will delete all organizer-created teams.');
    console.log('   Team owners will then be able to self-register and create their own teams.');
    console.log('\n   Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Delete all organizer-created teams
    const result = await Team.deleteMany({ ownerId: null });
    console.log(`\n✅ Deleted ${result.deletedCount} organizer-created teams`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

deleteOrganizerTeams();
