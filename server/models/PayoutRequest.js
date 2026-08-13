'use strict';
const mongoose = require('mongoose');

const payoutRequestSchema = new mongoose.Schema({
  organizerId:    { type: String, required: true, index: true },
  organizerEmail: { type: String, default: '' },
  amount:         { type: Number, required: true },   // paise
  currency:       { type: String, default: 'INR' },
  bankDetails: {
    accountHolder: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifscCode:      { type: String, default: '' },
    bankName:      { type: String, default: '' },
    upiId:         { type: String, default: '' },
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'rejected'],
    default: 'pending',
    index: true,
  },
  razorpayPayoutId: { type: String, default: '' },
  adminNote:      { type: String, default: '' },
  processedAt:    { type: Date, default: null },
  processedBy:    { type: String, default: '' },    // admin userId
}, { timestamps: true });

payoutRequestSchema.index({ organizerId: 1, createdAt: -1 });

module.exports = mongoose.model('PayoutRequest', payoutRequestSchema);
