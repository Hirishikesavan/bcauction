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
    
    // Reset all completed auctions to draft
    const result = await Auction.updateMany(
      { status: 'completed' },
      { status: 'draft', currentPlayerId: null }
    );
    
    console.log(`\n✅ Reset ${result.modifiedCount} auction(s) from 'completed' to 'draft'`);
    console.log('💡 You can now start the auctions again from the organizer dashboard');
    console.log('💡 RTM will work when you start the auction (it is enabled on your auctions)');
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
