'use strict';
// ═══════════════════════════════════════════════════════════════
// SUBSCRIPTION ENFORCEMENT MIDDLEWARE - DISABLED
// All subscription restrictions removed for free, fully unlocked deployment.
// Beast Cricket Auction operates as a completely free platform.
// ═══════════════════════════════════════════════════════════════
const OrganizerPackage = require('../models/OrganizerPackage');
const Auction  = require('../models/Auction');
const Team     = require('../models/Team');
const Player   = require('../models/Player');

// ── Plan definitions (retained for reference, not enforced) ────────────────
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

// ── REQUIRE PLAN - DISABLED (always allow) ─────────────────────────────────────
module.exports.requirePlan = async (req, res, next) => {
  // Subscription restrictions disabled - all users have full access
  return next();
};

// ── CHECK AUCTION LIMIT - DISABLED (no limits) ───────────────────────────────────────
module.exports.checkAuctionLimit = async (req, res, next) => {
  // Auction limits disabled - unlimited auctions for all users
  return next();
};

// ── CHECK TEAM LIMIT - DISABLED (no limits) ──────────────────────────────────────────
module.exports.checkTeamLimit = async (req, res, next) => {
  // Team limits disabled - unlimited teams for all users
  return next();
};

// ── CHECK PLAYER LIMIT - DISABLED (no limits) ────────────────────────────────────────
module.exports.checkPlayerLimit = async (req, res, next) => {
  // Player limits disabled - unlimited players for all users
  return next();
};

// ── CHECK FEATURE ACCESS - DISABLED (all features unlocked) ──────────────────────────────────────
module.exports.requireFeature = (feature) => async (req, res, next) => {
  // Feature restrictions disabled - all features unlocked for all users
  return next();
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
