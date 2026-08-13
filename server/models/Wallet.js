'use strict';
// ═══════════════════════════════════════════════════════════════
// ORGANIZER WALLET — Tracks every rupee collected via platform
// ═══════════════════════════════════════════════════════════════
const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['player_reg_credit', 'team_fee_credit', 'payout_debit', 'refund_debit', 'adjustment'],
    required: true,
  },
  amount:       { type: Number, required: true },       // in paise
  currency:     { type: String, default: 'INR' },
  reference:    { type: String, default: '' },          // paymentId / orderId
  description:  { type: String, default: '' },
  auctionId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', default: null },
  paymentId:    { type: String, default: '' },          // razorpay payment_id
  status:       { type: String, enum: ['pending','settled','failed'], default: 'settled' },
  settledAt:    { type: Date, default: Date.now },
}, { timestamps: true });

const walletSchema = new mongoose.Schema({
  organizerId:    { type: String, required: true, unique: true, index: true },
  totalEarnings:  { type: Number, default: 0 },   // lifetime in paise
  pendingBalance: { type: Number, default: 0 },   // awaiting settlement (T+2)
  availableBalance: { type: Number, default: 0 }, // ready to withdraw
  totalWithdrawn: { type: Number, default: 0 },
  currency:       { type: String, default: 'INR' },
  transactions:   [walletTransactionSchema],
}, { timestamps: true });

walletSchema.index({ organizerId: 1, updatedAt: -1 });

module.exports = mongoose.model('OrganizerWallet', walletSchema);
