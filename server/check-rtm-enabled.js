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
    
    // Load Auction model
    const Auction = require('./models/Auction');
    
    // Get all auctions
    const auctions = await Auction.find({});
    console.log(`\n📊 Found ${auctions.length} auctions`);
    
    for (const auction of auctions) {
      console.log(`\n═══════════════════════════════════════════════════════`);
      console.log(`🏆 Auction: ${auction.name}`);
      console.log(`   ID: ${auction._id}`);
      console.log(`   Status: ${auction.status}`);
      console.log(`   RTM Enabled: ${auction.rtmEnabled ? '✅ YES' : '❌ NO'}`);
      console.log(`   RTM Per Team: ${auction.rtmPerTeam || 'Not set'}`);
      console.log(`═══════════════════════════════════════════════════════`);
    }
    
    console.log('\n✅ Check completed!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
