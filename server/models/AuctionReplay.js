const mongoose = require('mongoose');
const auctionReplaySchema = new mongoose.Schema({
  auctionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', required: true, index: true },
  playerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  playerName: String,
  teamId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  teamName:  String,
  teamColor: String,
  bidAmount: Number,
  event:     { type: String, enum: ['bid','sold','unsold','rtm','round_start','round_end','auction_start','auction_end'], default: 'bid' },
  round:     { type: Number, default: 1 },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });
module.exports = mongoose.model('AuctionReplay', auctionReplaySchema);
