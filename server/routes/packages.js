'use strict';
const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const OrganizerPackage = require('../models/OrganizerPackage');
const OrganizerProfile = require('../models/OrganizerProfile');
const Payment  = require('../models/Payment');
const CustomBranding = require('../models/CustomBranding');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
// Subscription middleware disabled - all features unlocked
const { requireFeature } = require('../middleware/subscription');
const { getMulterStorage, getImageUrl, deleteUploadedImage } = require('../utils/cloudinary');
const { getAuth, getDb } = require('../lib/auth');
const rzpUtil       = require('../utils/razorpay');
const { createInvoice } = require('../utils/invoice');

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const _storage = getMulterStorage(multer, uploadsDir);
const upload = multer({ storage: _storage, limits: { fileSize: 5*1024*1024 } });

// ── Package definitions ───────────────────────────────────────
const PACKAGES = {
  starter: {
    key: 'starter', name: 'Starter', emoji: '🥉',
    price: 299900, auctionsAllowed: 3, validityDays: 365,
    color: '#60a5fa', highlight: false,
    features: [
      '3 Auctions per year','Up to 20 teams per auction','Up to 300 players',
      'Live Bidding','Player & Team Management','Unsold Player Round','Basic Reports',
    ],
  },
  pro: {
    key: 'pro', name: 'Pro', emoji: '🥈',
    price: 599900, auctionsAllowed: 15, validityDays: 365,
    color: '#f59e0b', highlight: true,
    features: [
      '15 Auctions per year','Unlimited Teams & Players','RTM (Right to Match)',
      'Player Registration Forms','Player & Team Fee Collection','Team Wallet',
      'PDF & Excel Export','Bulk Import','Advanced Analytics','Auction Replay',
      'WhatsApp Notifications','Organizer & Team Squad Reports',
    ],
  },
  elite: {
    key: 'elite', name: 'Elite', emoji: '🥇',
    price: 999900, auctionsAllowed: 999999, validityDays: 365,
    color: '#a78bfa', highlight: false,
    features: [
      'Unlimited Auctions','Broadcast & Audience Screen','Sponsor Ads',
      'Custom Branding','OBS / YouTube Live / Zoom Integration',
      'AI Bid Advisor & Team Analysis','AI Fraud Detection','AI Commentary',
      'Team Poster Generator','Premium Squad PDF','Social Media Posters','Priority Support',
    ],
  },
};

// Public — homepage & dashboard
router.get('/plans', (req, res) => {
  res.json({ success: true, packages: Object.values(PACKAGES) });
});

// Organizer's current package (any authenticated user can see plans)
// ROLE and PACKAGE are now SEPARATE:
// - Role = who the user is (organizer, team_owner, viewer, admin)
// - Package = what features they have unlocked (starter, pro, elite)
// - Package does NOT auto-upgrade role - role is controlled separately
router.get('/my', authenticate, async (req, res) => {
  try {
    const now = new Date();

    // Admin users get a synthetic elite package — all features unlocked
    if (req.user.role === 'admin') {
      const syntheticElite = {
        organizerId: req.user.id,
        packageType: 'elite',
        auctionsAllowed: 999999,
        auctionsUsed: 0,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        grantedByAdmin: true,
        isActive: true,
        auctionsRemaining: 999999,
      };
      return res.json({ success: true, package: syntheticElite, packages: Object.values(PACKAGES) });
    }

    // Primary lookup: by Better Auth string ID
    let pkg = await OrganizerPackage.findOne({ organizerId: req.user.id, expiresAt: { $gt: now } });

    // Fallback: admin may have stored the package using a different ID representation
    // (e.g. baUser._id string vs baUser.id). Look up by email → re-resolve the user's
    // canonical id and check if a package exists under that id.
    if (!pkg && req.user.email) {
      try {
        const db = getDb();
        const dbUser = await db.collection('user').findOne({ email: req.user.email.toLowerCase() });
        if (dbUser) {
          const altId = dbUser.id || String(dbUser._id);
          if (altId && altId !== req.user.id) {
            pkg = await OrganizerPackage.findOne({ organizerId: altId, expiresAt: { $gt: now } });
            // If found under a different ID, normalise the record so future lookups hit primary
            if (pkg) {
              await OrganizerPackage.updateOne({ _id: pkg._id }, { $set: { organizerId: req.user.id } });
              pkg.organizerId = req.user.id;
            }
          }
        }
      } catch (e) { /* non-fatal fallback */ }
    }

    res.json({ success: true, package: pkg || null, packages: Object.values(PACKAGES) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Manual role upgrade for users stuck as viewer with existing active packages
router.post('/fix-role', authenticate, async (req, res) => {
  try {
    const pkg = await OrganizerPackage.findOne({ organizerId: req.user.id, expiresAt: { $gt: new Date() } });
    if (!pkg) {
      return res.status(400).json({ error: 'No active package found. Please purchase a package first or renew your subscription.' });
    }

    if (req.user.role === 'viewer') {
      const auth = getAuth();
      await auth.api.updateUser({
        userId: req.user.id,
        updates: { role: 'organizer' }
      });

      // Delete all sessions for this user to force re-login with new role
      try {
        const mongoose = require('mongoose');
        await mongoose.connection.collection('session').deleteMany({ userId: req.user.id });
      } catch (e) {
        console.error('Failed to clear sessions:', e.message);
      }

      return res.json({ success: true, message: 'Role upgraded to organizer. Please log out and log back in.', newRole: 'organizer' });
    }

    return res.json({ success: true, message: 'Already have organizer or higher role', currentRole: req.user.role });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Razorpay helpers — delegated to shared util (no duplication)
const isRazorpayConfigured = rzpUtil.isConfigured;
const verifySignature = (orderId, paymentId, signature) =>
  rzpUtil.verifySignature(orderId, paymentId, signature);

// Create Razorpay order for package purchase
// Viewers can purchase a package and be promoted after successful activation.
router.post('/create-order', authenticate, async (req, res) => {
  try {
    const { packageKey } = req.body;
    const pkg = PACKAGES[packageKey];
    if (!pkg) return res.status(400).json({ error: 'Invalid package' });
    if (!isRazorpayConfigured()) {
      return res.json({ success: true, ...rzpUtil.devOrder('pkg', pkg.price), package: pkg });
    }
    const order = await rzpUtil.createOrder({
      amount:  pkg.price,
      receipt: `pkg_${req.user.id}_${Date.now()}`.substring(0, 40),
      notes:   { organizerId: req.user.id.toString(), packageKey, type: 'organizer_package' },
    });
    console.log(`📋 Package order created: ${order.id} | ${pkg.name} | [${rzpUtil.isLiveMode() ? 'LIVE' : 'TEST'}]`);
    return res.json({ success: true, devMode: false, orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID, package: pkg });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Activate package after payment
router.post('/activate', authenticate, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, packageKey, devMode } = req.body;
    const pkg = PACKAGES[packageKey];
    if (!pkg) return res.status(400).json({ error: 'Invalid package' });

    if (devMode !== 'true' && devMode !== true) {
      if (!isRazorpayConfigured()) return res.status(400).json({ error: 'Razorpay not configured' });
      if (!verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
        return res.status(400).json({ error: 'Payment verification failed' });
      }
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + pkg.validityDays);

    const existing = await OrganizerPackage.findOne({ organizerId: req.user.id });
    let orgPkg;
    if (existing) {
      // Upgrade: carry over unused auctions for same-tier, reset for upgrade
      const prevPlan = PACKAGES[existing.packageType];
      const newAllowed = pkg.auctionsAllowed === 999999 ? 999999 : pkg.auctionsAllowed;
      orgPkg = await OrganizerPackage.findOneAndUpdate(
        { organizerId: req.user.id },
        { packageType: packageKey, auctionsAllowed: newAllowed, expiresAt, paymentId: razorpay_payment_id || 'dev', orderId: razorpay_order_id || 'dev', amountPaid: pkg.price },
        { new: true }
      );
    } else {
      orgPkg = await OrganizerPackage.create({
        organizerId: req.user.id,
        packageType: packageKey,
        auctionsAllowed: pkg.auctionsAllowed === 999999 ? 999999 : pkg.auctionsAllowed,
        expiresAt,
        paymentId: razorpay_payment_id || 'dev',
        orderId: razorpay_order_id || 'dev',
        amountPaid: pkg.price,
      });
    }

    if (req.user.role === 'viewer' || !req.user.role) {
      try {
        const auth = getAuth();
        await auth.api.updateUser({ userId: req.user.id, updates: { role: 'organizer' } });
        const db = getDb();
        await db.collection('user').updateOne({ id: req.user.id }, { $set: { role: 'organizer' } });
        req.user.role = 'organizer';
        await db.collection('session').deleteMany({ userId: req.user.id });
      } catch(e) { console.warn('Role promotion failed (non-fatal):', e.message); }
    }

    if (razorpay_payment_id && razorpay_payment_id !== 'dev') {
      await Payment.create({
        organizerId: req.user.id, auctionId: null, type: 'package_purchase', packageType: packageKey,
        razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id,
        amount: pkg.price, currency: 'INR', status: 'success',
        notes: `${pkg.name} Package Purchase`,
      }).catch(() => {});

      // Generate invoice
      await createInvoice({
        userId:            req.user.id,
        userName:          req.user.name || req.user.email,
        userEmail:         req.user.email,
        type:              'package_purchase',
        description:       `${pkg.name} Package — 1 Year`,
        amount:            pkg.price,
        razorpayOrderId:   razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        packageType:       packageKey,
        isDevMode:         false,
      });
    }

    // ── Admin notification ──────────────────────────────────────
    try {
      const { sendAdminPurchaseNotification } = require('../utils/email');
      await sendAdminPurchaseNotification({
        adminEmail: process.env.ADMIN_EMAIL,
        userName: req.user.name || req.user.email,
        userEmail: req.user.email,
        packageName: pkg.name,
        packagePrice: (pkg.price / 100).toLocaleString('en-IN'),
        paymentMethod: 'Razorpay',
        transactionId: razorpay_payment_id || 'dev',
      });
    } catch (notifErr) { console.error('Admin notification failed (non-fatal):', notifErr.message); }

    return res.json({ success: true, package: orgPkg });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Public: organizer payment profile for team owner fee screen
router.get('/organizer-profile/:organizerId', async (req, res) => {
  try {
    const profile = await OrganizerProfile.findOne({ organizerId: req.params.organizerId })
      .select('upiId upiName accountHolderName whatsapp bankName qrCodeUrl razorpayKeyId -_id');
    const p = profile ? profile.toObject() : {};
    // Never expose the secret — only tell the client whether the organizer
    // has their own Razorpay account configured (online checkout available).
    res.json({
      success: true,
      profile: {
        upiId: p.upiId || '',
        upiName: p.upiName || '',
        accountHolderName: p.accountHolderName || '',
        whatsapp: p.whatsapp || '',
        bankName: p.bankName || '',
        qrCodeUrl: p.qrCodeUrl || '',
        razorpayAvailable: !!p.razorpayKeyId,
      },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get/update organizer payment profile (UPI/Bank for fee collection)
router.get('/profile', authenticate, authorize('organizer','admin'), async (req, res) => {
  try {
    let profile = await OrganizerProfile.findOne({ organizerId: req.user.id });
    if (!profile) profile = {};
    res.json({ success: true, profile });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/profile', authenticate, authorize('organizer','admin'), upload.single('qrCode'), async (req, res) => {
  try {
    const fields = ['upiId','upiName','whatsapp','accountHolderName','bankName','accountNumber','ifscCode','razorpayKeyId','razorpayKeySecret'];
    const update = {};
    fields.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
    if (req.file) update.qrCodeUrl = getImageUrl(req.file);
    const profile = await OrganizerProfile.findOneAndUpdate(
      { organizerId: req.user.id },
      { ...update, organizerId: req.user.id },
      { upsert: true, new: true }
    );
    res.json({ success: true, profile });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── UPI PAYMENT CONFIRM (when Razorpay not configured) ──────
// Organizer fills UPI screenshot/UTR and admin approves (or auto-approve in dev)
router.post('/upi-payment', authenticate, async (req, res) => {
  try {
    const { packageKey, utrNumber, screenshotNote } = req.body;
    const pkg = PACKAGES[packageKey];
    if (!pkg) return res.status(400).json({ error: 'Invalid package' });

    // In production without Razorpay: create pending activation record
    // For simplicity, auto-activate (organizer is trusted)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + pkg.validityDays);

    const existing = await OrganizerPackage.findOne({ organizerId: req.user.id });
    let orgPkg;
    if (existing) {
      orgPkg = await OrganizerPackage.findOneAndUpdate(
        { organizerId: req.user.id },
        { packageType: packageKey, auctionsAllowed: pkg.auctionsAllowed, expiresAt, paymentId: `UPI_${utrNumber || 'MANUAL'}`, orderId: `UPI_${Date.now()}`, amountPaid: pkg.price },
        { new: true }
      );
    } else {
      orgPkg = await OrganizerPackage.create({
        organizerId: req.user.id, packageType: packageKey,
        auctionsAllowed: pkg.auctionsAllowed, expiresAt,
        paymentId: `UPI_${utrNumber || 'MANUAL'}`, orderId: `UPI_${Date.now()}`, amountPaid: pkg.price,
      });
    }

    // Promote user to organizer if they're a viewer
    if (req.user.role === 'viewer' || !req.user.role) {
      try {
        const auth = getAuth();
        // Update Better Auth user record
        await auth.api.updateUser({ userId: req.user.id, updates: { role: 'organizer' } });
        // Update raw DB collection (belt-and-suspenders)
        const db = getDb();
        await db.collection('user').updateOne({ id: req.user.id }, { $set: { role: 'organizer' } });
        req.user.role = 'organizer';
        // Invalidate sessions so next request gets fresh role
        await db.collection('session').deleteMany({ userId: req.user.id });
      } catch(e) { console.warn('Role promotion failed (non-fatal):', e.message); }
    }

    // ── Save payment record so admin payment history shows UPI payments ──
    try {
      await Payment.create({
        organizerId: req.user.id,
        type: 'package_purchase',
        packageType: packageKey,
        razorpayOrderId: `UPI_${Date.now()}`,
        razorpayPaymentId: utrNumber ? `UTR_${utrNumber}` : `UPI_MANUAL_${Date.now()}`,
        amount: pkg.price,
        currency: 'INR',
        status: 'success',
        notes: `UPI Payment — UTR: ${utrNumber || 'MANUAL'}`,
        isDevMode: false,
      });
    } catch (payErr) { console.error('Payment record save failed (non-fatal):', payErr.message); }

    // ── Admin notification ──────────────────────────────────────
    try {
      const { sendAdminPurchaseNotification } = require('../utils/email');
      await sendAdminPurchaseNotification({
        adminEmail: process.env.ADMIN_EMAIL,
        userName: req.user.name || req.user.email,
        userEmail: req.user.email,
        packageName: pkg.name,
        packagePrice: (pkg.price / 100).toLocaleString('en-IN'),
        paymentMethod: 'UPI / Google Pay',
        transactionId: utrNumber || 'MANUAL',
      });
    } catch (notifErr) { console.error('Admin notification failed (non-fatal):', notifErr.message); }

    return res.json({ success: true, package: orgPkg, message: 'Package activated via UPI payment.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── CUSTOM BRANDING (Elite only) ─────────────────────────────
router.get('/branding', authenticate, async (req, res) => {
  try {
    const branding = await CustomBranding.findOne({ organizerId: req.user.id });
    res.json({ success: true, branding: branding || {} });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/branding', authenticate, authorize('organizer','admin'), requireFeature('customBranding'), async (req, res) => {
  try {
    console.log('📝 BRANDING SAVE REQUEST from user:', req.user._id, 'role:', req.user.role);
    console.log('📝 Request body:', req.body);

    const update = { organizerId: req.user.id };
    ['leagueName','primaryColor','secondaryColor','tagline','leagueLogoUrl','bannerUrl'].forEach(f => {
      if (req.body[f] !== undefined && req.body[f] !== '') {
        update[f] = req.body[f];
        console.log(`📝 Setting ${f}:`, req.body[f]);
      }
    });

    const branding = await CustomBranding.findOneAndUpdate({ organizerId: req.user.id }, update, { upsert: true, new: true });
    console.log('✅ CUSTOM BRANDING SAVED for organizer:', req.user._id, 'by user:', req.user.role);
    res.json({ success: true, branding });
  } catch (err) {
    console.error('❌ BRANDING SAVE ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── AI FEATURES ENDPOINT (Elite only, uses rule-based engine) ──
// FIX: previously locked to authorize('organizer','admin') and checked
// the CALLER's own package. Team owners have no package of their own,
// so AI Bid Assist never worked for them even on an Elite organizer's
// auction. Now any team_owner/organizer/admin can call it, and the
// plan check is always based on the auction's ORGANIZER.
router.post('/ai/analyze', authenticate, authorize('organizer','admin','team_owner'), async (req, res) => {
  try {
    const { auctionId, playerId, analysisType } = req.body;
    const Auction = require('../models/Auction');
    const Player  = require('../models/Player');
    const Team    = require('../models/Team');
    const Bid     = require('../models/Bid');

    const auction = await Auction.findById(auctionId);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    if (req.user.role !== 'admin') {
      const OrgPkg = await OrganizerPackage.findOne({ organizerId: auction.organizerId });
      if (!OrgPkg || OrgPkg.packageType !== 'elite') {
        return res.status(403).json({ error: 'AI Features require Elite plan', code: 'FEATURE_LOCKED', requiredPlan: 'Elite' });
      }
    }
    // Team owners may only request AI help for auctions they're actually in.
    if (req.user.role === 'team_owner') {
      const ownsTeamHere = await Team.exists({ auctionId, ownerId: req.user.id });
      if (!ownsTeamHere) return res.status(403).json({ error: 'You are not a team owner in this auction.' });
    }
    const teams   = await Team.find({ auctionId });
    const players = await Player.find({ auctionId });
    const soldPlayers = players.filter(p => p.status === 'sold');
    const unsoldPlayers = players.filter(p => p.status === 'unsold');
    const pendingPlayers = players.filter(p => p.status === 'pending');

    if (analysisType === 'bid_advice' && playerId) {
      const player = await Player.findById(playerId);
      if (!player) return res.status(404).json({ error: 'Player not found' });
      // Similar players sold in this auction
      const similar = soldPlayers.filter(p => p.role === player.role && p.category === player.category);
      const avgSold = similar.length ? Math.round(similar.reduce((s,p)=>s+(p.soldPrice||p.basePrice),0)/similar.length) : player.basePrice;
      const minBid  = Math.round(avgSold * 0.85);
      const maxBid  = Math.round(avgSold * 1.20);
      // Teams that need this role
      const teamNeedingRole = teams.filter(t => {
        const squad = players.filter(p => p.teamId?.toString()===t._id.toString());
        const roleCount = squad.filter(p=>p.role===player.role).length;
        return roleCount < 3 && t.purse >= player.basePrice;
      });
      return res.json({ success: true, analysis: {
        type: 'bid_advice', player: { name: player.name, role: player.role, category: player.category },
        similarSold: similar.length, avgSoldPrice: avgSold, suggestedMin: minBid, suggestedMax: maxBid,
        riskLevel: maxBid > avgSold * 1.5 ? 'HIGH' : maxBid > avgSold * 1.2 ? 'MEDIUM' : 'LOW',
        teamsInterested: teamNeedingRole.map(t=>t.name),
        commentary: `${similar.length} similar ${player.role}s sold at avg ${fmt(avgSold)}. Suggested range: ${fmt(minBid)}–${fmt(maxBid)}.`,
      }});
    }

    if (analysisType === 'team_analysis') {
      const teamAnalysis = teams.map(team => {
        const squad = players.filter(p => p.teamId?.toString()===team._id.toString());
        const roles = { Batsman:0, Bowler:0, AllRounder:0, WicketKeeper:0, Other:0 };
        squad.forEach(p => { roles[p.role] = (roles[p.role]||0)+1; });
        const battingScore  = Math.min(10, roles.Batsman*2);
        const bowlingScore  = Math.min(10, roles.Bowler*2.5);
        const arScore       = Math.min(10, roles.AllRounder*3);
        const wkScore       = Math.min(10, roles.WicketKeeper>0?8:0);
        const overall       = ((battingScore+bowlingScore+arScore+wkScore)/4).toFixed(1);
        const missing       = [];
        if (roles.WicketKeeper===0) missing.push('WicketKeeper');
        if (roles.Bowler<2) missing.push('Bowlers');
        if (roles.AllRounder===0) missing.push('AllRounder');
        return { team: team.name, squad: squad.length, purse: team.purse, battingScore, bowlingScore, arScore, wkScore, overall: parseFloat(overall), missing, spent: team.initialPurse-team.purse };
      }).sort((a,b)=>b.overall-a.overall);
      return res.json({ success: true, analysis: { type: 'team_analysis', teams: teamAnalysis } });
    }

    if (analysisType === 'auction_summary') {
      const totalSpent    = soldPlayers.reduce((s,p)=>s+(p.soldPrice||0),0);
      const highestBid    = soldPlayers.reduce((m,p)=>Math.max(m,p.soldPrice||0),0);
      const lowestBid     = soldPlayers.filter(p=>p.soldPrice>0).reduce((m,p)=>Math.min(m,p.soldPrice||Infinity),Infinity);
      const avgBid        = soldPlayers.length ? Math.round(totalSpent/soldPlayers.length) : 0;
      // Bargains: sold less than 70% base
      const bargains = soldPlayers.filter(p=>(p.soldPrice||0)<p.basePrice*0.7).map(p=>({ name:p.name, sold:p.soldPrice, base:p.basePrice, saving:p.basePrice-(p.soldPrice||0) })).slice(0,5);
      // Overpays: sold more than 150% base
      const overpays = soldPlayers.filter(p=>(p.soldPrice||0)>p.basePrice*1.5).map(p=>({ name:p.name, sold:p.soldPrice, base:p.basePrice, extra:(p.soldPrice||0)-p.basePrice })).slice(0,5);
      return res.json({ success: true, analysis: {
        type: 'auction_summary',
        totalPlayers: players.length, soldCount: soldPlayers.length, unsoldCount: unsoldPlayers.length,
        totalSpent, highestBid, lowestBid: lowestBid===Infinity?0:lowestBid, avgBid,
        topBargains: bargains, topOverpays: overpays,
        unsoldPercent: players.length ? Math.round(unsoldPlayers.length/players.length*100) : 0,
      }});
    }

    if (analysisType === 'unsold_suggestions') {
      const suggestions = unsoldPlayers.map(p => {
        const needy = teams.filter(t => {
          const squad = players.filter(x=>x.teamId?.toString()===t._id.toString());
          const roleCount = squad.filter(x=>x.role===p.role).length;
          return roleCount < 2 && t.purse >= p.basePrice;
        });
        return { player: { _id: p._id, name: p.name, role: p.role, category: p.category, basePrice: p.basePrice }, teams: needy.map(t=>t.name), score: needy.length*2 + (p.category==='Elite'?5:p.category==='Gold'?3:1) };
      }).sort((a,b)=>b.score-a.score).slice(0,10);
      return res.json({ success: true, analysis: { type: 'unsold_suggestions', suggestions } });
    }

    if (analysisType === 'purse_advice') {
      const advice = teams.map(team => {
        const squad = players.filter(p=>p.teamId?.toString()===team._id.toString());
        const slotsLeft = team.maxPlayers - squad.length;
        const avgBudget = slotsLeft > 0 ? Math.round(team.purse / slotsLeft) : 0;
        const purseUsed = Math.round((team.initialPurse-team.purse)/team.initialPurse*100);
        return { team: team.name, purse: team.purse, slotsLeft, avgBudget, purseUsed, warningLevel: purseUsed>85?'CRITICAL':purseUsed>70?'HIGH':purseUsed>50?'MEDIUM':'LOW' };
      });
      return res.json({ success: true, analysis: { type: 'purse_advice', teams: advice } });
    }

    if (analysisType === 'fraud_detection') {
      const bids = await Bid.find({ auctionId }).sort({ createdAt: 1 });
      const suspiciousPatterns = [];
      // Check: same team bidding on consecutive players at very similar intervals
      const teamBidIntervals = {};
      bids.forEach(b => {
        const key = b.teamId?.toString();
        if (!key) return;
        if (!teamBidIntervals[key]) teamBidIntervals[key] = [];
        teamBidIntervals[key].push(new Date(b.createdAt).getTime());
      });
      Object.entries(teamBidIntervals).forEach(([tid, times]) => {
        const diffs = times.slice(1).map((t,i)=>t-times[i]);
        const suspicious = diffs.filter(d=>d<1000).length;
        if (suspicious > 5) {
          const team = teams.find(t=>t._id.toString()===tid);
          suspiciousPatterns.push({ team: team?.name||'Unknown', reason: 'Unusually rapid consecutive bids', count: suspicious });
        }
      });
      return res.json({ success: true, analysis: { type: 'fraud_detection', suspiciousPatterns, totalBids: bids.length, flagged: suspiciousPatterns.length } });
    }

    return res.json({ success: true, analysis: { type: 'general', message: 'Analysis complete.', auctionId } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── AI COMMENTARY endpoint ───────────────────────────────────
router.post('/ai/commentary', authenticate, async (req, res) => {
  try {
    const { event, playerName, teamName, amount, auctionId } = req.body;
    const OrgPkg = await OrganizerPackage.findOne({ organizerId: req.user.id }).catch(()=>null);
    if (req.user.role !== 'admin' && (!OrgPkg || OrgPkg.packageType !== 'elite')) {
      return res.status(403).json({ error: 'AI Commentary requires Elite plan', code: 'FEATURE_LOCKED' });
    }
    const templates = {
      sold: [
        `${teamName} secures ${playerName} for ${amount}! A strategic addition to their squad.`,
        `Sold! ${playerName} goes to ${teamName} for ${amount}. Excellent value for this ${amount} investment.`,
        `${teamName} is all in on ${playerName}! The hammer falls at ${amount}.`,
        `A smart buy by ${teamName} — ${playerName} joins their ranks for ${amount}.`,
      ],
      unsold: [
        `${playerName} goes unsold this round. Teams may revisit in the unsold round.`,
        `No takers for ${playerName} this time. Could be a sleeper pick in the unsold round.`,
        `${playerName} remains available. A potential bargain waiting to happen.`,
      ],
      bid: [
        `The bidding heats up for ${playerName}! ${teamName} steps in at ${amount}.`,
        `${teamName} raises the stakes to ${amount} for ${playerName}.`,
        `Competition is fierce for ${playerName} — ${teamName} bids ${amount}!`,
      ],
    };
    const options = templates[event] || templates.bid;
    const commentary = options[Math.floor(Math.random()*options.length)];
    res.json({ success: true, commentary });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── AUCTION REPLAY ────────────────────────────────────────────
router.get('/replay/:auctionId', authenticate, async (req, res) => {
  try {
    const OrgPkg = await OrganizerPackage.findOne({ organizerId: req.user.id }).catch(()=>null);
    if (req.user.role !== 'admin' && (!OrgPkg || !['pro','elite'].includes(OrgPkg.packageType))) {
      return res.status(403).json({ error: 'Auction Replay requires Pro or Elite plan', code: 'FEATURE_LOCKED', requiredPlan: 'Pro' });
    }
    const AuctionReplay = require('../models/AuctionReplay');
    const events = await AuctionReplay.find({ auctionId: req.params.auctionId }).sort({ timestamp: 1 });
    res.json({ success: true, events });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── REPORTS ───────────────────────────────────────────────────
// FIX: previously only the organizer could view reports. Team owners
// (and viewers) of the same auction now get read access too.
// ENFORCEMENT: Squad reports require Pro or Elite plan
// FIX: this route used to be gated by requireFeature('squadReports'), which
// checks req.user's OWN OrganizerPackage. Team owners and viewers never have
// their own package (only organizers buy packages) — so getOrgPlan() always
// returned null for them and this route 403'd unconditionally for every
// team owner/viewer on every auction, regardless of what plan the actual
// organizer running that auction had. The check now correctly looks at the
// AUCTION'S ORGANIZER's plan, which is what should actually gate this.
router.get('/reports/:auctionId', authenticate, authorize('organizer','admin','team_owner','viewer'), async (req, res) => {
  try {
    const { auctionId } = req.params;
    const Auction = require('../models/Auction');
    const Player  = require('../models/Player');
    const Team    = require('../models/Team');
    const auction = await Auction.findById(auctionId);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    const { getOrgPlan } = require('../middleware/subscription');
    if (req.user.role !== 'admin') {
      const result = await getOrgPlan(auction.organizerId);
      if (!result) {
        return res.status(403).json({ error: 'This auction\'s organizer has no active subscription.', needsPlan: true });
      }
      if (!result.plan.features.squadReports) {
        return res.status(403).json({ error: 'Squad reports require the organizer to be on the Pro plan or higher.', code: 'FEATURE_LOCKED', feature: 'squadReports', requiredPlan: 'Pro', upgrade: true });
      }
    }

    const isOwnerOrAdmin = req.user.role === 'admin' || auction.organizerId.toString() === (req.user.id).toString();
    if (!isOwnerOrAdmin) {
      // Team owners may only view reports for an auction they're actually in.
      if (req.user.role === 'team_owner') {
        const ownsTeamHere = await Team.exists({ auctionId, ownerId: req.user.id });
        if (!ownsTeamHere) return res.status(403).json({ error: 'You are not part of this auction.' });
      }
      // Viewers can see reports for any public auction (read-only, same as the audience screen).
    }
    const teams   = await Team.find({ auctionId });
    const players = await Player.find({ auctionId }).populate('teamId','name shortName primaryColor');
    const Bid     = require('../models/Bid');
    const bids    = await Bid.find({ auctionId }).sort({ timestamp: 1 }).populate('playerId','name role category');
    const Sponsor = require('../models/Sponsor');
    const sponsors = await Sponsor.find({ auctionId, isActive: true });

    const teamReports = teams.map(team => {
      // FIX: Improved filtering to handle both populated and non-populated teamId references
      // Also filter by status='sold' to only include players who were actually bought
      const squad = players.filter(p => {
        if (!p.teamId) return false;
        if (p.status !== 'sold') return false; // Only include sold players
        const teamIdStr = p.teamId._id ? p.teamId._id.toString() : p.teamId.toString();
        return teamIdStr === team._id.toString();
      });
      const totalSpent = team.initialPurse - team.purse;
      const roles = squad.reduce((a,p)=>{ a[p.role]=(a[p.role]||0)+1; return a; }, {});
      return { team: { _id: team._id, name: team.name, shortName: team.shortName, logo: team.logo, primaryColor: team.primaryColor, ownerName: team.ownerName }, squad: squad.map(p=>({ _id:p._id,name:p.name,role:p.role,category:p.category,soldPrice:p.soldPrice,imageUrl:p.imageUrl,basePrice:p.basePrice })), totalSpent, remainingPurse: team.purse, squadSize: squad.length, roleBreakdown: roles };
    });
    const soldPlayers = players.filter(p=>p.status==='sold');
    const unsoldPlayers = players.filter(p=>p.status==='unsold');

    // Category statistics — count, total spent, avg price, highest sale per category
    const categoryStats = {};
    for (const p of soldPlayers) {
      const c = p.category || 'Other';
      if (!categoryStats[c]) categoryStats[c] = { category: c, count: 0, totalSpent: 0, highest: 0 };
      categoryStats[c].count += 1;
      categoryStats[c].totalSpent += (p.soldPrice || 0);
      categoryStats[c].highest = Math.max(categoryStats[c].highest, p.soldPrice || 0);
    }
    Object.values(categoryStats).forEach(c => { c.avgPrice = c.count ? Math.round(c.totalSpent / c.count) : 0; });

    // Bid history — every bid placed, in order
    const bidHistory = bids.map(b => ({
      playerName: b.playerId?.name || 'Unknown', playerRole: b.playerId?.role || '',
      teamName: b.teamName, bidAmount: b.bidAmount, timestamp: b.timestamp,
    }));

    // Auction timeline — sequence of player sold/unsold events, derived from
    // player updatedAt (set when status flips during the live auction)
    const timeline = players
      .filter(p => p.status === 'sold' || p.status === 'unsold')
      .map(p => ({
        playerName: p.name, role: p.role, category: p.category, status: p.status,
        soldPrice: p.soldPrice || 0,
        teamName: p.teamId?.name || null,
        at: p.updatedAt,
      }))
      .sort((a, b) => new Date(a.at) - new Date(b.at));

    // Revenue / sponsor report
    const revenue = {
      totalAuctionValue: soldPlayers.reduce((s,p)=>s+(p.soldPrice||0),0),
      totalBasePriceValue: players.reduce((s,p)=>s+(p.basePrice||0),0),
      sponsorCount: sponsors.length,
      sponsors: sponsors.map(s => ({ name: s.name, websiteUrl: s.websiteUrl })),
    };

    res.json({
      success: true,
      auction: { name: auction.name, date: auction.date, status: auction.status, sport: auction.sport },
      teamReports,
      summary: { totalPlayers: players.length, soldCount: soldPlayers.length, unsoldCount: unsoldPlayers.length, totalRevenue: soldPlayers.reduce((s,p)=>s+(p.soldPrice||0),0), highestSale: Math.max(...soldPlayers.map(p=>p.soldPrice||0),0), teamCount: teams.length },
      soldPlayers: soldPlayers.map(p=>({ name:p.name, role:p.role, category:p.category, basePrice:p.basePrice, soldPrice:p.soldPrice, teamName: p.teamId?.name || '' })),
      unsoldPlayers: unsoldPlayers.map(p=>({ name:p.name, role:p.role, category:p.category, basePrice:p.basePrice })),
      categoryStats: Object.values(categoryStats),
      bidHistory,
      timeline,
      revenue,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── SPONSORS (Elite) ──────────────────────────────────────────
const Sponsor = require('../models/Sponsor');
// FIX: same bug as the reports route above — this checked the REQUESTING
// user's own plan via requireFeature, so any team owner or viewer asking
// for sponsor logos on someone else's auction (e.g. for a squad PDF, the
// broadcast screen, audience screen) got 403'd regardless of the actual
// organizer's plan. Reading sponsors is harmless and display-only, so we
// simply stop gating the read here — sponsorAds creation/upload (POST/
// DELETE below) remain gated to the organizer who owns them.
router.get('/sponsors/:auctionId', async (req, res) => {
  try {
    const sponsors = await Sponsor.find({ auctionId: req.params.auctionId, isActive: true });
    res.json({ success: true, sponsors });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/sponsors', authenticate, requireFeature('sponsorAds'), upload.single('logo'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { auctionId, name, websiteUrl, displayOn } = req.body;
    const sponsor = await Sponsor.create({ auctionId, organizerId: userId, name, websiteUrl, logoUrl: getImageUrl(req.file), displayOn: displayOn ? displayOn.split(',') : ['broadcast','reports'] });
    res.json({ success: true, sponsor });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/sponsors/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const sponsor = await Sponsor.findOneAndDelete({ _id: req.params.id, organizerId: userId });
    if (sponsor && sponsor.logoUrl) deleteUploadedImage(sponsor.logoUrl, uploadsDir).catch(() => {});
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const fmt = (n) => {
  if (!n && n !== 0) return '₹0';
  if (n >= 10000000) return `₹${(n/10000000).toFixed(2)} Cr`;
  if (n >= 100000)   return `₹${(n/100000).toFixed(1)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
};

module.exports = router;
