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
    
    // Get all auctions
    const auctions = await Auction.find({});
    console.log(`\n📊 Found ${auctions.length} auctions`);
    
    for (const auction of auctions) {
      console.log(`\n═══════════════════════════════════════════════════════`);
      console.log(`🏆 Auction: ${auction.name}`);
      console.log(`   ID: ${auction._id}`);
      console.log(`   Status: ${auction.status}`);
      console.log(`═══════════════════════════════════════════════════════`);
      
      // Count players by status
      const players = await Player.find({ auctionId: auction._id });
      console.log(`   Total players: ${players.length}`);
      
      const statusCounts = {
        active: players.filter(p => p.status === 'active').length,
        pending: players.filter(p => p.status === 'pending').length,
        sold: players.filter(p => p.status === 'sold').length,
        unsold: players.filter(p => p.status === 'unsold').length,
      };
      
      console.log(`   Active: ${statusCounts.active}`);
      console.log(`   Pending: ${statusCounts.pending}`);
      console.log(`   Sold: ${statusCounts.sold}`);
      console.log(`   Unsold: ${statusCounts.unsold}`);
      
      // Show sample active players
      if (statusCounts.active > 0) {
        console.log(`   Sample active players:`);
        players.filter(p => p.status === 'active').slice(0, 3).forEach(p => {
          console.log(`      - ${p.name} (${p.category})`);
        });
      }
    }
    
    console.log('\n✅ Check completed!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
