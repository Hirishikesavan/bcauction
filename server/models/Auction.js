const mongoose = require('mongoose');

const auctionSchema = new mongoose.Schema({
  // FIXED: String type to match Better Auth string user IDs
  organizerId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: String,
  date: { type: Date, required: true },
  status: { type: String, enum: ['draft','scheduled','active','paused','completed'], default: 'draft' },
  bidTimer: { type: Number, default: 30 },
  bidIncrement: { type: Number, default: 500000 },
  totalPursePerTeam: { type: Number, default: 100000000 },
  currentPlayerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  bannerImage: String,
  isPublic: { type: Boolean, default: true },
  joinCode: { type: String, unique: true, uppercase: true },
  maxTeams: { type: Number, default: 10 },
  rtmEnabled: { type: Boolean, default: true },
  rtmPerTeam: { type: Number, default: 2 },
  registrationFee: { type: Number, default: 0 },
  registrationFeeEnabled: { type: Boolean, default: false },
  teamOwnerFee: { type: Number, default: 0 },
  teamOwnerFeeEnabled: { type: Boolean, default: false },
  // Scheduled start
  scheduledAt: { type: Date, default: null },       // auto-start time (null = manual start)
  scheduledJobId: { type: String, default: null },   // internal scheduler reference
  // Broadcast viewer mode (Elite only)
  broadcastEnabled: { type: Boolean, default: false },
}, { timestamps: true });

// Auto-generate a 6-char code before saving
auctionSchema.pre('save', function(next) {
  if (!this.joinCode) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    this.joinCode = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }
  next();
});

module.exports = mongoose.model('Auction', auctionSchema);
