// ════════════════════════════════════════════════════════════════════════════
// CHECK USER IDs - Debug Script
// ════════════════════════════════════════════════════════════════════════════
// This script checks the structure of user IDs in the database
// ════════════════════════════════════════════════════════════════════════════

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Team = require('./models/Team');

async function checkUserIds() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/beast-cricket');
    console.log('✅ Connected to MongoDB');

    // Find all users
    const users = await User.find({});
    console.log(`\n📋 Found ${users.length} users in database`);

    for (const user of users) {
      console.log(`\n👤 User: ${user.email}`);
      console.log(`   _id: ${user._id} (type: ${typeof user._id})`);
      console.log(`   id: ${user.id} (type: ${typeof user.id})`);
      console.log(`   Role: ${user.role}`);
    }

    // Find all teams
    const teams = await Team.find({});
    console.log(`\n📋 Found ${teams.length} teams in database`);

    for (const team of teams) {
      console.log(`\n🏆 Team: ${team.name}`);
      console.log(`   _id: ${team._id}`);
      console.log(`   ownerId: ${team.ownerId} (type: ${typeof team.ownerId})`);
      
      if (team.ownerId) {
        // Try to find matching user
        const userBy_id = await User.findOne({ _id: team.ownerId });
        const userById = await User.findOne({ id: team.ownerId.toString() });
        
        console.log(`   User found by _id: ${userBy_id ? userBy_id.email : 'none'}`);
        console.log(`   User found by id: ${userById ? userById.email : 'none'}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

checkUserIds();
