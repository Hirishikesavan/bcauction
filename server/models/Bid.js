const mongoose = require('mongoose');
const bidSchema = new mongoose.Schema({
  auctionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', required: true },
  playerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Player',  required: true },
  teamId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Team',    required: true },
  teamName:      String,
  teamShortName: String,
  teamColor:     String,
  bidAmount: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

// Index for fast bid history lookup per player
bidSchema.index({ auctionId: 1, playerId: 1, createdAt: -1 });

module.exports = mongoose.model('Bid', bidSchema);
