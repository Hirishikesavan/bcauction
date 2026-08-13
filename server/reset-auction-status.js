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
    
    // Load models
    const Player = require('./models/Player');
    const Auction = require('./models/Auction');
    
    // Find auctions that are completed but have active players
    const completedAuctions = await Auction.find({ status: 'completed' });
    console.log(`\n📊 Found ${completedAuctions.length} completed auctions`);
    
    let resetCount = 0;
    
    for (const auction of completedAuctions) {
      // Check if this auction has active players
      const activePlayers = await Player.countDocuments({ auctionId: auction._id, status: 'active' });
      
      if (activePlayers > 0) {
        console.log(`\n🔄 Resetting auction: ${auction.name}`);
        console.log(`   Has ${activePlayers} active players that haven't been sold`);
        
        // Reset auction status to draft
        await Auction.findByIdAndUpdate(auction._id, { 
          status: 'draft',
          currentPlayerId: null
        });
        
        console.log(`   ✅ Status changed from 'completed' to 'draft'`);
        resetCount++;
      }
    }
    
    if (resetCount === 0) {
      console.log('\n✅ No auctions needed to be reset. All completed auctions have no active players.');
    } else {
      console.log(`\n✅ Reset ${resetCount} auction(s) to draft status`);
      console.log('💡 You can now start the auction again from the organizer dashboard');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
