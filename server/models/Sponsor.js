const mongoose = require('mongoose');
const sponsorSchema = new mongoose.Schema({
  auctionId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', required: true },
  organizerId: { type: String, required: true, index: true },
  name:        { type: String, required: true },
  logoUrl:     String,
  websiteUrl:  String,
  displayOn:   { type: [String], default: ['broadcast','reports','welcome'] },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });
module.exports = mongoose.model('Sponsor', sponsorSchema);
