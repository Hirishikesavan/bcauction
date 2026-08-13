'use strict';
// ═══════════════════════════════════════════════════════════════
// SUBSCRIPTION ENFORCEMENT MIDDLEWARE
// All limits enforced server-side — frontend hiding is NOT enough.
// ═══════════════════════════════════════════════════════════════
const OrganizerPackage = require('../models/OrganizerPackage');
const Auction  = require('../models/Auction');
const Team     = require('../models/Team');
const Player   = require('../models/Player');

// ── Plan definitions (single source of truth) ────────────────
const PLANS = {
  starter: {
    name: 'Starter', price: 299900, // ₹2999
    auctionsPerYear: 3, maxTeams: 20, maxPlayers: 300,
    features: {
      rtm: false, feeCollection: false, pdfExport: false,
      excelExport: false, bulkImport: false, advancedAnalytics: false,
      auctionReplay: false, whatsappNotifications: false, squadReports: false,
      broadcastScreen: false, audienceScreen: false, customBranding: false,
      sponsorAds: false, aiFeatures: false, obsIntegration: false,
      youtubeLive: false, zoomIntegration: false, teamPoster: false,
      premiumPDF: false, socialPosters: false,
    },
  },
  pro: {
    name: 'Pro', price: 599900, // ₹5999
    auctionsPerYear: 15, maxTeams: Infinity, maxPlayers: Infinity,
    features: {
      rtm: true, feeCollection: true, pdfExport: true,
      excelExport: true, bulkImport: true, advancedAnalytics: true,
      auctionReplay: true, whatsappNotifications: true, squadReports: true,
      broadcastScreen: false, audienceScreen: false, customBranding: false,
      sponsorAds: false, aiFeatures: false, obsIntegration: false,
      youtubeLive: false, zoomIntegration: false, teamPoster: false,
      premiumPDF: false, socialPosters: false,
    },
  },
  elite: {
    name: 'Elite', price: 999900, // ₹9999
    auctionsPerYear: 999999, maxTeams: Infinity, maxPlayers: Infinity,
    features: {
      rtm: true, feeCollection: true, pdfExport: true,
      excelExport: true, bulkImport: true, advancedAnalytics: true,
      auctionReplay: true, whatsappNotifications: true, squadReports: true,
      broadcastScreen: true, audienceScreen: true, customBranding: true,
      sponsorAds: true, aiFeatures: true, obsIntegration: true,
      youtubeLive: true, zoomIntegration: true, teamPoster: true,
      premiumPDF: true, socialPosters: true,
    },
  },
};

module.exports.PLANS = PLANS;

// ── Get organizer's active plan ───────────────────────────────
const getOrgPlan = async (organizerId) => {
  if (!organizerId) return null;
  const idStr = organizerId.toString();
  const now = new Date();
  const pkg = await OrganizerPackage.findOne({
    $or: [{ organizerId: idStr }, { organizerId: organizerId }],
    expiresAt: { $gt: now },
  });
  if (!pkg) return null;
  return { pkg, plan: PLANS[pkg.packageType] || PLANS.starter };
};
module.exports.getOrgPlan = getOrgPlan;

// ── REQUIRE PLAN ─────────────────────────────────────────────
module.exports.requirePlan = async (req, res, next) => {
  if (!req.user || req.user.role === 'admin') return next();
  const result = await getOrgPlan(req.user.id);
  if (!result) {
    return res.status(403).json({
      error: 'No active subscription. Please purchase a plan to continue.',
      needsPlan: true, code: 'NO_PLAN',
    });
  }
  req.orgPlan = result;
  return next();
};

// ── CHECK AUCTION LIMIT ───────────────────────────────────────
module.exports.checkAuctionLimit = async (req, res, next) => {
  if (!req.user || req.user.role === 'admin') return next();
  try {
    const result = await getOrgPlan(req.user.id);
    if (!result) {
      return res.status(403).json({
        error: 'No active subscription. Please purchase a plan.',
        needsPlan: true, code: 'NO_PLAN',
      });
    }
    const { pkg, plan } = result;
    if (pkg.auctionsUsed >= pkg.auctionsAllowed) {
      return res.status(403).json({
        error: `Auction limit reached (${pkg.auctionsAllowed}). Upgrade your plan.`,
        code: 'AUCTION_LIMIT', limit: pkg.auctionsAllowed, used: pkg.auctionsUsed, upgrade: true,
      });
    }
    req.orgPlan = result;
    return next();
  } catch (err) {
    return res.status(500).json({ error: 'Subscription check failed: ' + err.message });
  }
};

// ── CHECK TEAM LIMIT ──────────────────────────────────────────
module.exports.checkTeamLimit = async (req, res, next) => {
  if (!req.user || req.user.role === 'admin') return next();
  try {
    const { id: auctionId } = req.params;
    const result = await getOrgPlan(req.user.id);
    if (!result) return next();
    const { plan } = result;
    if (plan.maxTeams === Infinity) return next();
    const count = await Team.countDocuments({ auctionId });
    if (count >= plan.maxTeams) {
      return res.status(403).json({
        error: `${plan.name} Plan allows only ${plan.maxTeams} teams per auction.`,
        code: 'TEAM_LIMIT', limit: plan.maxTeams, current: count, upgrade: true,
      });
    }
    req.orgPlan = result;
    return next();
  } catch (err) {
    return res.status(500).json({ error: 'Subscription check failed: ' + err.message });
  }
};

// ── CHECK PLAYER LIMIT ────────────────────────────────────────
module.exports.checkPlayerLimit = async (req, res, next) => {
  if (!req.user || req.user.role === 'admin') return next();
  try {
    const { id: auctionId } = req.params;
    const auction = await Auction.findById(auctionId).select('organizerId');
    if (!auction) return next();
    const result = await getOrgPlan(auction.organizerId);
    if (!result) return next();
    const { plan } = result;
    if (plan.maxPlayers === Infinity) return next();
    const count = await Player.countDocuments({ auctionId });
    if (count >= plan.maxPlayers) {
      return res.status(403).json({
        error: `${plan.name} Plan allows only ${plan.maxPlayers} players per auction.`,
        code: 'PLAYER_LIMIT', limit: plan.maxPlayers, current: count, upgrade: true,
      });
    }
    return next();
  } catch (err) {
    return res.status(500).json({ error: 'Subscription check failed: ' + err.message });
  }
};

// ── CHECK FEATURE ACCESS ──────────────────────────────────────
module.exports.requireFeature = (feature) => async (req, res, next) => {
  if (!req.user || req.user.role === 'admin') return next();
  try {
    let result;
    
    // For team owners, check the auction's organizer's plan instead of their own
    if (req.user.role === 'team_owner' && req.params.auctionId) {
      const Auction = require('../models/Auction');
      const auction = await Auction.findById(req.params.auctionId).select('organizerId');
      if (auction) {
        result = await getOrgPlan(auction.organizerId);
      }
    } else {
      result = await getOrgPlan(req.user.id);
    }
    
    if (!result) {
      return res.status(403).json({ error: 'No active subscription.', needsPlan: true });
    }
    const { plan } = result;
    if (!plan.features[feature]) {
      const eliteFeatures = ['broadcastScreen','audienceScreen','customBranding','sponsorAds','aiFeatures','obsIntegration','youtubeLive','zoomIntegration','teamPoster','premiumPDF','socialPosters'];
      const upgradeTo = eliteFeatures.includes(feature) ? 'Elite' : 'Pro';
      return res.status(403).json({
        error: `This feature requires the ${upgradeTo} plan or higher.`,
        code: 'FEATURE_LOCKED', feature, requiredPlan: upgradeTo, upgrade: true,
      });
    }
    req.orgPlan = result;
    return next();
  } catch (err) {
    return res.status(500).json({ error: 'Subscription check failed: ' + err.message });
  }
};

// ── ROBUST PACKAGE LOOKUP ─────────────────────────────────────
// Finds OrganizerPackage for the given user, trying multiple ID strategies.
// Use this instead of OrganizerPackage.findOne({ organizerId: req.user.id })
// everywhere in the codebase to handle ID format mismatches.
const getOrgPackageForUser = async (userId, userEmail) => {
  const now = new Date();
  // 1. Primary: by Better Auth string id
  let pkg = await OrganizerPackage.findOne({ organizerId: userId, expiresAt: { $gt: now } });
  if (pkg) return pkg;

  // 2. Fallback: try email → resolve canonical id → look up package
  // Covers the case where admin stored package with a slightly different id representation
  if (userEmail) {
    try {
      const { getDb } = require('../lib/auth');
      const db = getDb();
      if (db) {
        const dbUser = await db.collection('user').findOne({ email: userEmail.toLowerCase() });
        if (dbUser) {
          const altId = dbUser.id || String(dbUser._id);
          if (altId && altId !== userId) {
            pkg = await OrganizerPackage.findOne({ organizerId: altId, expiresAt: { $gt: now } });
            if (pkg) {
              // Normalise: update organizerId to the canonical id for future lookups
              await OrganizerPackage.updateOne({ _id: pkg._id }, { $set: { organizerId: userId } });
              pkg.organizerId = userId;
              return pkg;
            }
          }
        }
      }
    } catch (e) { /* non-fatal */ }
  }
  return null;
};
module.exports.getOrgPackageForUser = getOrgPackageForUser;
