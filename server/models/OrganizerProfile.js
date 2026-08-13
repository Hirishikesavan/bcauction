const mongoose = require('mongoose');

// Organizer's payment/bank details so player registration fees go directly to them
const organizerProfileSchema = new mongoose.Schema({
  organizerId: { type: String, required: true, unique: true, index: true },
  // UPI / GPay
  upiId: { type: String, trim: true, default: '' },         // e.g. 9876543210@gpay
  upiName: { type: String, trim: true, default: '' },       // Display name for UPI
  // Bank details (optional alternative)
  bankName: { type: String, trim: true, default: '' },
  accountNumber: { type: String, trim: true, default: '' },
  ifscCode: { type: String, trim: true, default: '' },
  accountHolderName: { type: String, trim: true, default: '' },
  // QR code image URL (optional) — organizer's own GPay/UPI QR code
  qrCodeUrl: { type: String, default: '' },
  // Contact for payment queries
  whatsapp: { type: String, trim: true, default: '' },
  // Organizer's own Razorpay account — when set, fee payments (team-owner
  // entry fee, player registration) are created against the ORGANIZER's
  // Razorpay account so funds land directly with them, not the platform.
  razorpayKeyId: { type: String, trim: true, default: '' },
  razorpayKeySecret: { type: String, trim: true, default: '' },
  // Profile photo
  profilePhoto: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('OrganizerProfile', organizerProfileSchema);
