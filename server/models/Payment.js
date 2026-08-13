const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  organizerId: { type: String, required: true, index: true },
  type: { type: String, enum: ['package_purchase', 'auction_creation', 'player_registration', 'team_owner_fee'], required: true },
  packageType: { type: String, enum: ['starter', 'pro', 'elite', null], default: null },
  // Razorpay
  razorpayOrderId:   { type: String, default: '' },
  razorpayPaymentId: { type: String, default: '' },
  // Amount in paise
  amount:   { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['pending', 'success', 'failed', 'refunded'], default: 'pending' },
  // Metadata
  auctionId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', default: null },
  playerName:  { type: String, default: '' },
  notes:       { type: String, default: '' },
  // Dev mode
  isDevMode:   { type: Boolean, default: false },
  // Refund
  refundedAt:  { type: Date, default: null },
  refundReason:{ type: String, default: '' },
}, { timestamps: true });

paymentSchema.index({ organizerId: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ razorpayPaymentId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
