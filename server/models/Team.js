const mongoose = require('mongoose');
require('./BetterAuthUser'); // ensure ref target is registered before any populate('ownerId')


const teamSchema = new mongoose.Schema({
  auctionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', required: true },
  // FIX: this used to ref: 'User' (the legacy, disconnected Mongoose model —
  // collection "users"). Real logged-in owners come from Better Auth's
  // session, whose ids live in the separate "user" collection. With the
  // wrong ref, every populate('ownerId') silently resolved to null, which
  // broke team-owner-to-team matching everywhere (no bid button, etc).
  // FIXED: String type to match Better Auth string user IDs
  ownerId: { type: String, default: null, index: true },
  // Team profile (filled by team owner)
  name: { type: String, required: true },
  shortName: { type: String, required: true, maxlength: 4 },
  ownerName: { type: String },
  city: { type: String },
  logo: String,
  primaryColor: { type: String, default: '#f59e0b' },
  // Financials
  purse: { type: Number, required: true },
  initialPurse: { type: Number, required: true },
  playersCount: { type: Number, default: 0 },
  maxPlayers: { type: Number, default: 15 },
  // RTM (Right to Match)
  rtmTotal: { type: Number, default: 2 },
  rtmUsed: { type: Number, default: 0 },
  // Team Wallet (Pro/Elite) — separate wallet for top-ups/credits
  walletBalance: { type: Number, default: 0 },
  walletTransactions: [{
    type: { type: String, enum: ['credit','debit'], default: 'credit' },
    amount: { type: Number },
    note: { type: String },
    at: { type: Date, default: Date.now },
  }],
  // Status
  joinedAt: { type: Date, default: Date.now },
  isConfirmed: { type: Boolean, default: false },
  teamOwnerFeePaid: { type: Boolean, default: false },
  teamOwnerFeeUTR: { type: String, default: '' },
}, { timestamps: true });

// Virtual: RTM remaining
teamSchema.virtual('rtmRemaining').get(function() {
  return Math.max(0, this.rtmTotal - this.rtmUsed);
});

module.exports = mongoose.model('Team', teamSchema);
