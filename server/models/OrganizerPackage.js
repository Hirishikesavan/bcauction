const mongoose = require('mongoose');

// CRITICAL FIX: organizerId must be String (not ObjectId) because Better Auth
// stores users with string IDs, not MongoDB ObjectIds. Using ObjectId caused
// OrganizerPackage.findOne({ organizerId: req.user.id }) to always return null
// because the string ID never matched the ObjectId field type.
const organizerPackageSchema = new mongoose.Schema({
  organizerId:      { type: String, required: true, unique: true, index: true },
  packageType:      { type: String, enum: ['starter', 'pro', 'elite'], required: true },
  auctionsAllowed:  { type: Number, required: true },
  auctionsUsed:     { type: Number, default: 0 },
  purchasedAt:      { type: Date, default: Date.now },
  expiresAt:        { type: Date, required: true },
  paymentId:        { type: String },
  orderId:          { type: String },
  amountPaid:       { type: Number },
  grantedByAdmin:   { type: Boolean, default: false },
  grantedAt:        { type: Date },
}, { timestamps: true });

organizerPackageSchema.virtual('auctionsRemaining').get(function () {
  return Math.max(0, this.auctionsAllowed - this.auctionsUsed);
});

organizerPackageSchema.virtual('isActive').get(function () {
  return this.expiresAt > new Date() && this.auctionsRemaining > 0;
});

organizerPackageSchema.set('toJSON',   { virtuals: true });
organizerPackageSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('OrganizerPackage', organizerPackageSchema);
