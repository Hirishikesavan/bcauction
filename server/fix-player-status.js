// Fix player status - change 'active' to 'pending' for players that haven't been sold/unsold
// Run this script to fix existing players created before the bug fix

const mongoose = require('mongoose');
const Player = require('./models/Player');

require('dotenv').config();

async function fixPlayerStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/beast-cricket');
    console.log('✅ Connected to MongoDB');

    // Find all players with status 'active' that haven't been sold or unsold
    // These are the players that were created with the wrong status
    const playersToFix = await Player.find({ 
      status: 'active',
      $or: [
        { soldPrice: { $exists: false } },
        { soldPrice: null }
      ]
    });

    console.log(`📊 Found ${playersToFix.length} players with wrong status`);

    if (playersToFix.length === 0) {
      console.log('✅ No players need fixing');
      process.exit(0);
    }

    // Update all these players to 'pending' status
    const result = await Player.updateMany(
      { 
        status: 'active',
        $or: [
          { soldPrice: { $exists: false } },
          { soldPrice: null }
        ]
      },
      { status: 'pending' }
    );

    console.log(`✅ Fixed ${result.modifiedCount} players from 'active' to 'pending'`);
    
    // Verify the fix
    const remainingActive = await Player.countDocuments({ 
      status: 'active',
      $or: [
        { soldPrice: { $exists: false } },
        { soldPrice: null }
      ]
    });
    
    console.log(`📊 Remaining players with 'active' status (should be 0): ${remainingActive}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing player status:', error);
    process.exit(1);
  }
}

fixPlayerStatus();
