require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    
    // Load Player model
    const Player = require('./models/Player');
    
    // Find all players with status 'pending' that are not sold or unsold
    const pendingPlayers = await Player.find({ status: 'pending' });
    
    console.log(`\n📊 Found ${pendingPlayers.length} players with status 'pending'`);
    
    if (pendingPlayers.length === 0) {
      console.log('✅ No pending players found. All players already have correct status.');
      process.exit(0);
    }
    
    // Update all pending players to active
    const result = await Player.updateMany(
      { status: 'pending' },
      { status: 'active' }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} players from 'pending' to 'active'`);
    
    // Verify the update
    const activePlayers = await Player.find({ status: 'active' });
    console.log(`📊 Total active players: ${activePlayers.length}`);
    
    console.log('\n✅ Player status fix completed successfully!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
