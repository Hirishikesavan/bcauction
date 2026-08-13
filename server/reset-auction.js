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
    const Auction = require('./models/Auction');
    const Player = require('./models/Player');
    const Bid = require('./models/Bid');
    const Team = require('./models/Team');
    const RTM = require('./models/RTM');
    
    // Find the big bash auction
    const auction = await Auction.findOne({ name: { $regex: /big bash/i } });
    
    if (!auction) {
      console.log('❌ No auction found with "Big Bash" in the name');
      console.log('Available auctions:');
      const allAuctions = await Auction.find({}, { name: 1, status: 1, _id: 1 });
      allAuctions.forEach(a => console.log(`  - ${a.name} (Status: ${a.status}, ID: ${a._id})`));
      process.exit(1);
    }
    
    console.log(`\n📊 Found auction: ${auction.name}`);
    console.log(`   ID: ${auction._id}`);
    console.log(`   Status: ${auction.status}`);
    console.log(`   Players: ${await Player.countDocuments({ auctionId: auction._id })}`);
    console.log(`   Teams: ${await Team.countDocuments({ auctionId: auction._id })}`);
    console.log(`   Bids: ${await Bid.countDocuments({ auctionId: auction._id })}`);
    
    // Confirm reset
    console.log('\n⚠️  This will:');
    console.log('   - Reset auction status to "scheduled"');
    console.log('   - Clear all bids');
    console.log('   - Reset all players to unsold');
    console.log('   - Clear all RTM cards');
    console.log('   - Keep teams intact');
    
    // Auto-confirm for this request
    console.log('\n🔄 Proceeding with reset...\n');
    
    // Reset auction status
    auction.status = 'scheduled';
    auction.currentPlayerId = null;
    auction.currentBid = 0;
    auction.currentBidderId = null;
    auction.startedAt = null;
    auction.endedAt = null;
    await auction.save();
    console.log('✅ Auction status reset to "scheduled"');
    
    // Clear all bids
    const bidDeleteResult = await Bid.deleteMany({ auctionId: auction._id });
    console.log(`✅ Deleted ${bidDeleteResult.deletedCount} bids`);
    
    // Reset all players to unsold
    const playerUpdateResult = await Player.updateMany(
      { auctionId: auction._id },
      { 
        status: 'unsold',
        soldTo: null,
        soldPrice: 0,
        soldAt: null
      }
    );
    console.log(`✅ Reset ${playerUpdateResult.modifiedCount} players to unsold`);
    
    // Clear all RTM cards
    const rtmDeleteResult = await RTM.deleteMany({ auctionId: auction._id });
    console.log(`✅ Deleted ${rtmDeleteResult.deletedCount} RTM cards`);
    
    // Reset team purses (optional - keeps original purse values)
    console.log('✅ Team data preserved (purses, rosters kept intact)');
    
    console.log('\n✅ Auction reset completed successfully!');
    console.log(`📊 Final state:`);
    console.log(`   Status: ${auction.status}`);
    console.log(`   Players: ${await Player.countDocuments({ auctionId: auction._id })}`);
    console.log(`   Teams: ${await Team.countDocuments({ auctionId: auction._id })}`);
    console.log(`   Bids: ${await Bid.countDocuments({ auctionId: auction._id })}`);
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
