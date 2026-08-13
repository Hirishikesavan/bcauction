// ════════════════════════════════════════════════════════════════════════════
// CHECK CURRENT TEAMS - Debug Script
// ════════════════════════════════════════════════════════════════════════════
// This script checks the current state of teams and their owner relationships
// ════════════════════════════════════════════════════════════════════════════

require('dotenv').config();
const mongoose = require('mongoose');
const Team = require('./models/Team');
const User = require('./models/User');
const Auction = require('./models/Auction');

async function checkCurrentTeams() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/beast-cricket');
    console.log('✅ Connected to MongoDB');

    // Find all users
    const users = await User.find({});
    console.log(`\n📋 Found ${users.length} users in database:\n`);

    for (const user of users) {
      console.log(`👤 ${user.email}`);
      console.log(`   _id: ${user._id}`);
      console.log(`   id: ${user.id}`);
      console.log(`   Role: ${user.role}\n`);
    }

    // Find all teams
    const teams = await Team.find({});
    console.log(`\n📋 Found ${teams.length} teams in database:\n`);

    for (const team of teams) {
      console.log(`🏆 Team: ${team.name}`);
      console.log(`   _id: ${team._id}`);
      console.log(`   auctionId: ${team.auctionId}`);
      console.log(`   ownerId: ${team.ownerId}`);
      
      if (team.ownerId) {
        // Try to find matching user
        const userBy_id = await User.findOne({ _id: team.ownerId });
        const userById = await User.findOne({ id: team.ownerId.toString() });
        
        console.log(`   User found by _id: ${userBy_id ? userBy_id.email : 'NONE'}`);
        console.log(`   User found by id: ${userById ? userById.email : 'NONE'}`);
        
        if (userBy_id) {
          console.log(`   ✅ This team belongs to: ${userBy_id.email}`);
        } else {
          console.log(`   ❌ ORPHANED TEAM - No matching user found`);
        }
      } else {
        console.log(`   ⚠️  NULL ownerId - Organizer-created team`);
      }
      
      // Get auction details
      const auction = await Auction.findById(team.auctionId);
      if (auction) {
        console.log(`   Auction: ${auction.name} (joinCode: ${auction.joinCode})`);
      }
      
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

checkCurrentTeams();
