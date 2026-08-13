'use strict';
// ═══════════════════════════════════════════════════════════════
// INVOICE — One invoice per successful payment event
// ═══════════════════════════════════════════════════════════════
const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true, index: true },
  // Who paid
  userId:       { type: String, required: true, index: true },
  userName:     { type: String, default: '' },
  userEmail:    { type: String, default: '' },
  // What they paid for
  type: {
    type: String,
    enum: ['package_purchase', 'auction_creation', 'player_registration', 'team_owner_fee'],
    required: true,
  },
  description:  { type: String, required: true },
  // Amounts
  amount:       { type: Number, required: true },       // in paise
  tax:          { type: Number, default: 0 },           // GST if applicable
  total:        { type: Number, required: true },        // amount + tax
  currency:     { type: String, default: 'INR' },
  // Razorpay references
  razorpayOrderId:   { type: String, default: '' },
  razorpayPaymentId: { type: String, default: '', index: true },
  // Relation
  auctionId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', default: null },
  organizerId:  { type: String, default: '' },   // beneficiary organizer for player/team fees
  packageType:  { type: String, default: '' },
  // Status
  status:       { type: String, enum: ['paid','refunded','cancelled'], default: 'paid' },
  paidAt:       { type: Date, default: Date.now },
  isDevMode:    { type: Boolean, default: false },
}, { timestamps: true });

invoiceSchema.index({ userId: 1, createdAt: -1 });
invoiceSchema.index({ razorpayPaymentId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
