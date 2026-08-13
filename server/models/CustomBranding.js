const mongoose = require('mongoose');
const brandingSchema = new mongoose.Schema({
  organizerId:  { type: String, required: true, unique: true, index: true },
  leagueName:   String,
  leagueLogoUrl:String,
  bannerUrl:    String,
  primaryColor: { type: String, default: '#f59e0b' },
  secondaryColor:{ type: String, default: '#1e3a5f' },
  tagline:      String,
}, { timestamps: true });
module.exports = mongoose.model('CustomBranding', brandingSchema);
