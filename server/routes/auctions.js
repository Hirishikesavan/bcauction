// ════════════════════════════════════════════════════════════════════════════
// AUCTIONS ROUTES - COMPLETE FIX WITH PLAYER IMAGE VISIBILITY
// ════════════════════════════════════════════════════════════════════════════
// FILE PATH: bca-fixed/bca/server/routes/auctions.js
// REPLACE THE ENTIRE FILE WITH THIS CODE
// ════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Auction = require('../models/Auction');
const Player = require('../models/Player');
const Team = require('../models/Team');
const Bid = require('../models/Bid');
const RTM = require('../models/RTM');
const User = require('../models/User');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
// Subscription middleware disabled - all features unlocked
const { checkTeamLimit, checkPlayerLimit, requireFeature } = require('../middleware/subscription');
const { promoteToTeamOwner } = require('../utils/promoteRole');

const { getMulterStorage, getImageUrl, deleteUploadedImage } = require('../utils/cloudinary');

// ─── Image Upload Configuration ─────────────────────────────────────────────
const uploadsDir = path.join(__dirname, '../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory:', uploadsDir);
}

const _storage = getMulterStorage(multer, uploadsDir);
const upload = multer({ 
  storage: _storage, 
  limits: { fileSize: 5*1024*1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Accept only image files
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      console.log('✅ Image file accepted:', file.originalname);
      return cb(null, true);
    } else {
      console.log('❌ Invalid file type rejected:', file.originalname);
      cb(new Error('Only image files are allowed (jpg, jpeg, png, gif, webp)'));
    }
  }
});

console.log('═══════════════════════════════════════════════════════');
console.log('📂 Uploads directory configured:', uploadsDir);
console.log('═══════════════════════════════════════════════════════');

// ─── PUBLIC ROUTES ──────────────────────────────────────────────────────────

// All auctions
router.get('/', optionalAuth, async (req, res) => {
  try {
    const filter = req.user?.role === 'admin' ? {} : { isPublic: true };
    const auctions = await Auction.find(filter).populate('organizerId','name email').sort({ createdAt: -1 });
    res.json({ success: true, auctions });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Join auction by code
// Public lookup by join code — used by the /join/[code] landing page so
// people can see what they're joining (or the final results, if the
// auction already ended) before they're asked to log in.
router.get('/by-code/:code', async (req, res) => {
  try {
    const code = (req.params.code || '').toUpperCase().trim();
    const auction = await Auction.findOne({ joinCode: code })
      .select('name status joinCode maxTeams startDate sport organizerId _id');
    if (!auction) return res.status(404).json({ error: 'Invalid or expired join code' });
    const teamCount = await Team.countDocuments({ auctionId: auction._id });
    res.json({
      success: true,
      auction: {
        _id: auction._id, name: auction.name, status: auction.status,
        joinCode: auction.joinCode, maxTeams: auction.maxTeams,
        teamCount, sport: auction.sport, startDate: auction.startDate,
      },
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/join-by-code', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Join code required' });
    const auction = await Auction.findOne({ joinCode: code.toUpperCase().trim() });
    if (!auction) return res.status(404).json({ error: 'Invalid join code' });
    if (auction.status === 'completed') return res.status(400).json({ error: 'Auction ended' });
    const teamCount = await Team.countDocuments({ auctionId: auction._id });
    if (teamCount >= auction.maxTeams) return res.status(400).json({ error: 'Auction full' });

    // Debug logging to identify user ID issues
    console.log('🔍 Join-by-code debug:');
    console.log('  User ID:', req.user.id, 'Type:', typeof req.user.id);
    console.log('  User Email:', req.user.email);
    console.log('  Auction ID:', auction._id);
    console.log('  Auction Name:', auction.name);

    // Convert better-auth string ID to ObjectId for MongoDB query
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const auctionIdStr = String(auction._id);

    console.log('  Converted userId to ObjectId:', userId, 'Type:', typeof userId);

    // Check ALL teams in this auction for debugging
    const allTeams = await Team.find({ auctionId: auctionIdStr });
    console.log('  All teams in auction:', allTeams.map(t => ({
      _id: t._id,
      name: t.name,
      ownerId: t.ownerId,
      ownerIdType: typeof t.ownerId
    })));

    const existing = await Team.findOne({ 
      auctionId: auctionIdStr, 
      ownerId: userId 
    });

    if (existing) {
      console.log('  ✅ Found existing team for user:', existing._id);
      console.log('  Existing team name:', existing.name);
      console.log('  Existing team ownerId:', existing.ownerId, 'Type:', typeof existing.ownerId);
      console.log('  Match check:', existing.ownerId.toString() === userId.toString());
      return res.json({ success: true, auction, team: existing, alreadyJoined: true });
    }

    console.log('  ❌ No existing team found, user can join');
    res.json({
      success: true, auction, alreadyJoined: false,
      teamOwnerFeeRequired: auction.teamOwnerFeeEnabled && auction.teamOwnerFee > 0,
      teamOwnerFee: auction.teamOwnerFeeEnabled ? auction.teamOwnerFee : 0,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// My auctions
router.get('/my', async (req, res) => {
  try {
    // No-auth mode - return all auctions
    const filter = {};
    const auctions = await Auction.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, auctions });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// FIX: team owners had no clean way to list "their" auctions for the
// Reports / Poster pages — this returns every auction where the caller
// owns a team.
router.get('/participated', async (req, res) => {
  try {
    // No-auth mode - return all auctions
    const auctions = await Auction.find({}).sort({ createdAt: -1 });
    res.json({ success: true, auctions });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Single auction
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id)
      .populate('organizerId','name email')
      .populate('currentPlayerId');
    if (!auction) return res.status(404).json({ error: 'Auction not found' });
    res.json({ success: true, auction });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── AUCTION PLAN — exposes the auction ORGANIZER's plan/features to
// everyone inside that auction (organizer, team owners, viewers).
// FIX: previously the client only fetched "/packages/my", which only
// works for the logged-in organizer. Team owners have no package of
// their own, so Elite features (AI bid assist, AI commentary, custom
// branding, sponsor ads, posters, broadcast/audience screen, etc.)
// never showed for them even when the organizer is on Elite.
router.get('/:id/plan', optionalAuth, async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id).select('organizerId');
    if (!auction) return res.status(404).json({ error: 'Auction not found' });
    const { getOrgPlan, PLANS } = require('../middleware/subscription');
    const result = await getOrgPlan(auction.organizerId);
    if (!result) {
      return res.json({ success: true, packageType: 'starter', features: PLANS.starter.features });
    }
    res.json({ success: true, packageType: result.pkg.packageType, features: result.plan.features });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Create auction
router.post('/', async (req, res) => {
  try {
    console.log('POST /auctions - NO-AUTH MODE - Request body:', req.body);
    console.log('POST /auctions - Version: 2024-08-15-1430 - Better Auth disabled');

    const { name, description, date, bidTimer, bidIncrement, totalPursePerTeam, maxTeams,
            rtmEnabled, rtmPerTeam, registrationFeeEnabled, registrationFee,
            teamOwnerFeeEnabled, teamOwnerFee } = req.body;

    // Authentication removed - Beast Cricket now operates as a completely free, fully unlocked platform
    // All users can create auctions without authentication
    // Generate a default organizer ID for no-auth mode
    const organizerId = 'default-organizer';

    const auction = new Auction({
      organizerId, name, description, date,
      bidTimer: parseInt(bidTimer)||30,
      bidIncrement: parseInt(bidIncrement)||500000,
      totalPursePerTeam: parseInt(totalPursePerTeam)||100000000,
      maxTeams: parseInt(maxTeams)||10,
      rtmEnabled: rtmEnabled !== 'false',
      rtmPerTeam: parseInt(rtmPerTeam)||2,
      bannerImage: req.file ? getImageUrl(req.file) : undefined,
      registrationFeeEnabled: registrationFeeEnabled === 'true' || registrationFeeEnabled === true,
      registrationFee: parseInt(registrationFee)||0,
      teamOwnerFeeEnabled: teamOwnerFeeEnabled === 'true' || teamOwnerFeeEnabled === true,
      teamOwnerFee: parseInt(teamOwnerFee)||0,
    });
    console.log('POST /auctions - Auction object before save:', auction);
    await auction.save();
    console.log('POST /auctions - Auction saved successfully:', auction._id);

    // Broadcast to everyone that a new auction exists
    const io = req.app.get('io');
    if (io) {
      io.emit('auctionCreated', {
        auction: {
          _id:         auction._id,
          name:        auction.name,
          date:        auction.date,
          status:      auction.status,
          organizerId: organizerId,
        },
      });
    }

    res.status(201).json({ success: true, auction });
  } catch (e) {
    console.error('POST /auctions - Error:', e);
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    // No-auth mode - allow update by ID only
    const filter = { _id: req.params.id };
    const auction = await Auction.findOneAndUpdate(filter, req.body, { new: true });
    if (!auction) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, auction });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    // No-auth mode - allow delete by ID only
    const filter = { _id: req.params.id };
    await Auction.findOneAndDelete(filter);
    await Player.deleteMany({ auctionId: req.params.id });
    await Team.deleteMany({ auctionId: req.params.id });
    await Bid.deleteMany({ auctionId: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── PLAYERS ────────────────────────────────────────────────────────────────

// Get all players for an auction
router.get('/:id/players', optionalAuth, async (req, res) => {
  try {
    const catOrder = { Elite:0, Gold:1, Silver:2, Emerging:3 };
    const players = await Player.find({ auctionId: req.params.id })
      .populate('teamId','name shortName primaryColor logo');
    
    players.sort((a,b) => catOrder[a.category]-catOrder[b.category] || b.basePrice-a.basePrice);
    
    console.log(`📋 Retrieved ${players.length} players for auction ${req.params.id}`);
    
    res.json({ success: true, players });
  } catch (e) { 
    console.error('❌ Get players error:', e.message);
    res.status(500).json({ error: e.message }); 
  }
});

// ✅✅✅ CRITICAL FIX: Add new player with proper image handling ✅✅✅
router.post('/:id/players', upload.single('image'), async (req, res) => {
  try {
    const { name, role, category, nationality, age, basePrice, matches, runs, wickets, average, strikeRate, economy } = req.body;

    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📸 NEW PLAYER CREATION WITH IMAGE');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Player Name:', name);
    console.log('Role:', role);
    console.log('Category:', category);
    console.log('Base Price:', basePrice);
    console.log('───────────────────────────────────────────────────────');

    // ── Image upload detailed logging ──────────────────────────────────
    let imageUrl = null;
    
    if (req.file) {
      console.log('📸 IMAGE FILE RECEIVED:');
      console.log('   ✓ Original name  :', req.file.originalname);
      console.log('   ✓ Mimetype       :', req.file.mimetype);
      console.log('   ✓ Size           :', (req.file.size / 1024).toFixed(2), 'KB');
      console.log('   ✓ Destination    :', req.file.destination || 'N/A');
      console.log('   ✓ Filename       :', req.file.filename);
      console.log('   ✓ Path           :', req.file.path);
      
      // Get the image URL
      imageUrl = getImageUrl(req.file);
      
      console.log('   ✓ Resolved URL   :', imageUrl);
      console.log('');
      
      // Verify file actually exists
      if (req.file.path && fs.existsSync(req.file.path)) {
        console.log('   ✅ FILE VERIFIED ON DISK');
        const stats = fs.statSync(req.file.path);
        console.log('   ✓ File size on disk:', (stats.size / 1024).toFixed(2), 'KB');
      } else {
        console.log('   ⚠️  WARNING: File not found on disk!');
      }
    } else {
      console.log('📸 NO IMAGE FILE UPLOADED');
      console.log('   ℹ️  Player will be created without image');
    }

    console.log('───────────────────────────────────────────────────────');
    console.log('💾 CREATING PLAYER IN DATABASE...');

    // Create player object with ACTIVE status
    const player = new Player({
      auctionId: req.params.id,
      name,
      role,
      category,
      nationality: nationality || 'Indian',
      age: age ? parseInt(age) : undefined,
      basePrice: parseInt(basePrice),
      imageUrl: imageUrl, // This will be the URL that frontend can access
      status: 'active',  // Players are active when registered, ready for auction
      stats: {
        matches:    parseInt(matches)    || 0,
        runs:       parseInt(runs)       || 0,
        wickets:    parseInt(wickets)    || 0,
        average:    parseFloat(average)  || 0,
        strikeRate: parseFloat(strikeRate) || 0,
        economy:    parseFloat(economy)  || 0,
      },
    });

    await player.save();

    console.log('✅ PLAYER SAVED SUCCESSFULLY!');
    console.log('───────────────────────────────────────────────────────');
    console.log('Player Details:');
    console.log('   ✓ ID            :', player._id);
    console.log('   ✓ Name          :', player.name);
    console.log('   ✓ Status        :', player.status); // Should show 'active'
    console.log('   ✓ Image URL     :', player.imageUrl || '(none)');
    console.log('   ✓ Base Price    :', player.basePrice);
    console.log('   ✓ Category      :', player.category);
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    const io = req.app.get('io');
    if (io) {
      io.to(req.params.id).emit('playerRegistered', {
        auctionId: req.params.id,
        player: player.toObject(),
      });
    }

    res.status(201).json({ 
      success: true, 
      player: player.toObject()
    });
  } catch (e) {
    console.error('');
    console.error('═══════════════════════════════════════════════════════');
    console.error('❌ ADD PLAYER ERROR');
    console.error('═══════════════════════════════════════════════════════');
    console.error('Error message:', e.message);
    console.error('Stack trace:', e.stack);
    console.error('═══════════════════════════════════════════════════════');
    console.error('');
    res.status(500).json({ error: e.message });
  }
});

// Public player registration via shareable link (no auth)
router.post('/:id/players/public-register', async (req, res) => {
  try {
    const { name, role, category, nationality, age, basePrice, matches, runs, wickets, average, strikeRate, imageUrl } = req.body;

    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });
    if (auction.status === 'completed') {
      return res.status(400).json({ error: 'Auction has ended. Player registration is closed.' });
    }
    // If fee is required, players must use the payment route, not this free one
    if (auction.registrationFeeEnabled && auction.registrationFee > 0) {
      return res.status(400).json({ error: 'This auction requires a registration fee. Please use the payment flow.' });
    }
    if (!name?.trim()) return res.status(400).json({ error: 'Player name is required' });
    if (!basePrice || parseInt(basePrice) <= 0) {
      return res.status(400).json({ error: 'Base price must be greater than 0' });
    }

    const player = new Player({
      auctionId: req.params.id,
      name: name.trim(),
      role,
      category,
      nationality: nationality || 'Indian',
      age: age ? parseInt(age) : undefined,
      basePrice: parseInt(basePrice),
      imageUrl: imageUrl || null,
      status: 'active',  // Players are active when registered, ready for auction
      stats: {
        matches: parseInt(matches) || 0,
        runs: parseInt(runs) || 0,
        wickets: parseInt(wickets) || 0,
        average: parseFloat(average) || 0,
        strikeRate: parseFloat(strikeRate) || 0,
        economy: 0,
      },
    });

    await player.save();

    console.log('✅ PUBLIC PLAYER REGISTERED:', player.name, 'for auction:', req.params.id);

    const io = req.app.get('io');
    if (io) {
      io.to(req.params.id).emit('playerRegistered', {
        auctionId: req.params.id,
        player: player.toObject(),
      });
    }

    res.status(201).json({
      success: true,
      player: player.toObject(),
      message: 'Player registered successfully!',
    });
  } catch (e) {
    console.error('❌ PUBLIC REGISTRATION ERROR:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Edit player
router.put('/:id/players/:playerId', upload.single('image'), async (req, res) => {
  try {
    const { playerId } = req.params;
    const player = await Player.findById(playerId);
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const updates = { ...req.body };

    // Parse numeric fields sent as strings from FormData
    if (updates.basePrice !== undefined) updates.basePrice = parseInt(updates.basePrice) || player.basePrice;
    if (updates.age !== undefined) updates.age = parseInt(updates.age) || player.age;

    // Parse nested stats if sent as JSON string
    if (typeof updates.stats === 'string') {
      try { updates.stats = JSON.parse(updates.stats); } catch { delete updates.stats; }
    }

    // Handle new image upload
    if (req.file) {
      // Delete old image
      if (player.imageUrl) {
        await deleteUploadedImage(player.imageUrl, uploadsDir).catch(() => {});
      }
      const ext  = req.file.originalname.split('.').pop() || 'jpg';
      const name = `player_${playerId}_${Date.now()}.${ext}`;
      const dest = path.join(uploadsDir, name);
      fs.writeFileSync(dest, req.file.buffer);
      updates.imageUrl = `/uploads/${name}`;
    }

    const updated = await Player.findByIdAndUpdate(playerId, updates, { new: true });
    console.log('✅ Player updated:', playerId);
    res.json({ success: true, player: updated });
  } catch (e) {
    console.error('❌ Update player error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Delete player
router.delete('/:id/players/:playerId', async (req, res) => {
  try {
    const player = await Player.findById(req.params.playerId);
    
    if (player && player.imageUrl) {
      await deleteUploadedImage(player.imageUrl, uploadsDir);
      console.log('🗑️  Deleted player image:', player.imageUrl);
    }
    
    await Player.findByIdAndDelete(req.params.playerId);
    console.log('✅ Player deleted:', req.params.playerId);
    
    res.json({ success: true });
  } catch (e) { 
    console.error('❌ Delete player error:', e.message);
    res.status(500).json({ error: e.message }); 
  }
});

// ─── TEAMS ──────────────────────────────────────────────────────────────────

router.get('/:id/teams', optionalAuth, async (req, res) => {
  try {
    // Team owners (and ONLY team owners) get their own team — never the full list.
    // Everyone else (organizer/admin/viewer/anonymous) gets the full public list,
    // which is intentional: lobby/poster/viewer/organizer screens need to show all teams.
    const role = req.user?.role;
    if (req.user && role === 'team_owner') {
      const userId = new mongoose.Types.ObjectId(req.user.id);
      const team = await Team.findOne({ auctionId: req.params.id, ownerId: userId }).populate('ownerId','name email');
      return res.json({ success: true, teams: team ? [team] : [] });
    }
    const teams = await Team.find({ auctionId: req.params.id }).populate('ownerId','name email');
    res.json({ success: true, teams });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Team owner creates their own team
router.post('/:id/teams/self-register', upload.single('logo'), async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });
    if (auction.status === 'completed') return res.status(400).json({ error: 'Auction completed' });

    // Debug logging
    console.log('🔍 Self-register debug (no-auth mode):');
    console.log('  Auction ID:', req.params.id);

    const auctionIdStr = String(req.params.id);
    const { name, shortName, ownerName, city, primaryColor } = req.body;

    // No-auth mode - generate a default owner ID
    const ownerId = 'default-team-owner';

    const existing = await Team.findOne({ auctionId: auctionIdStr, ownerId: ownerId });
    if (existing) {
      console.log('  ✅ Found existing team for user:', existing._id);
      return res.status(400).json({ error: 'You already have a team', team: existing });
    }

    const count = await Team.countDocuments({ auctionId: auctionIdStr });
    if (count >= auction.maxTeams) return res.status(400).json({ error: 'Auction full' });

    // ── Entry fee enforcement ────────────────────────────────────────────
    // If the organizer has enabled a team-owner entry fee, the team cannot
    // be created until payment is proven — either a verified Razorpay
    // payment, or a manually entered UTR/UPI reference number.
    if (auction.teamOwnerFeeEnabled && auction.teamOwnerFee > 0) {
      const { razorpay_payment_id, razorpay_order_id, razorpay_signature, utrNumber } = req.body;
      if (razorpay_payment_id && razorpay_order_id && razorpay_signature) {
        const OrganizerProfile = require('../models/OrganizerProfile');
        const crypto = require('crypto');
        const profile = await OrganizerProfile.findOne({ organizerId: auction.organizerId });
        const secret = (profile?.razorpayKeyId && profile?.razorpayKeySecret)
          ? profile.razorpayKeySecret
          : process.env.RAZORPAY_KEY_SECRET;
        const expected = secret
          ? crypto.createHmac('sha256', secret).update(razorpay_order_id + '|' + razorpay_payment_id).digest('hex')
          : null;
        if (!expected || expected !== razorpay_signature) {
          return res.status(400).json({ error: 'Payment verification failed' });
        }
      } else if (utrNumber && utrNumber.trim()) {
        // Manual UPI/QR payment — organizer is trusted to reconcile via UTR.
      } else {
        return res.status(402).json({ error: 'Entry fee payment required before joining', feeRequired: true, amount: auction.teamOwnerFee });
      }
    }

    const { name, shortName, ownerName, city, primaryColor } = req.body;
    const team = new Team({
      auctionId: auctionIdStr,
      ownerId: userId,
      name,
      shortName: shortName.toUpperCase().slice(0,4),
      ownerName: ownerName || req.user.name,
      city: city || '',
      primaryColor: primaryColor || '#f59e0b',
      purse: auction.totalPursePerTeam,
      initialPurse: auction.totalPursePerTeam,
      rtmTotal: auction.rtmPerTeam,
      logo: getImageUrl(req.file),
    });

    console.log('  💾 Creating new team with ownerId:', userId);
    console.log('  Team data before save:', {
      name: team.name,
      auctionId: team.auctionId,
      ownerId: team.ownerId,
      ownerIdType: typeof team.ownerId
    });
    await team.save();
    await promoteToTeamOwner(userId); // FIX: self-registering a team must grant team_owner role too
    console.log('  ✅ Team created successfully:', team._id);
    console.log('  Team data after save:', {
      _id: team._id,
      name: team.name,
      auctionId: team.auctionId,
      ownerId: team.ownerId,
      ownerIdType: typeof team.ownerId
    });

    // Broadcast new team - only send the created team, not all teams
    try {
      const io = require('../socket/io').getIO();
      if (io) {
        io.to(req.params.id).emit('teamJoined', { team });
      }
    } catch (e) { /* non-critical */ }

    res.status(201).json({ success: true, team, auction });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Organizer creates team
router.post('/:id/teams', upload.single('logo'), async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });
    
    const { name, shortName, ownerName, city, primaryColor, maxPlayers, ownerId } = req.body;
    
    // Require ownerId to prevent creating teams without owners
    if (!ownerId) {
      return res.status(400).json({ error: 'ownerId is required. Please assign a team owner to this team.' });
    }
    
    const team = new Team({
      auctionId: req.params.id,
      ownerId: new mongoose.Types.ObjectId(ownerId),
      name, 
      shortName: shortName.toUpperCase().slice(0,4),
      ownerName: ownerName || '',
      city: city || '',
      primaryColor: primaryColor || '#f59e0b',
      purse: auction.totalPursePerTeam,
      initialPurse: auction.totalPursePerTeam,
      maxPlayers: parseInt(maxPlayers)||15,
      rtmTotal: auction.rtmPerTeam,
      logo: getImageUrl(req.file),
    });
    await team.save();
    await promoteToTeamOwner(ownerId); // fix: auto-grant team_owner role to the assigned owner
    res.status(201).json({ success: true, team });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id/teams/:teamId', upload.single('logo'), async (req, res) => {
  try {
    const update = { ...req.body };
    if (req.file) {
      update.logo = getImageUrl(req.file);
      console.log('🖼️  Team logo updated:', update.logo);
    }
    const team = await Team.findByIdAndUpdate(req.params.teamId, update, { new: true }).populate('ownerId','name email');
    if (update.ownerId) await promoteToTeamOwner(update.ownerId); // fix: keep role in sync if owner is reassigned
    res.json({ success: true, team });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id/teams/:teamId', async (req, res) => {
  try {
    await Team.findByIdAndDelete(req.params.teamId);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// My team
router.get('/:id/my-team', async (req, res) => {
  try {
    const auctionIdStr = String(req.params.id);
    
    // No-auth mode - return all teams for the auction
    console.log('🔍 My-team debug (no-auth mode):');
    console.log('  Auction ID:', auctionIdStr);
    
    // Return all teams for the auction
    const teams = await Team.find({ auctionId: auctionIdStr }).populate('ownerId','name email');
    console.log('  All teams in auction:', teams.length);
    
    res.json({ success: true, teams });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── BIDS ───────────────────────────────────────────────────────────────────

router.get('/:id/bids', optionalAuth, async (req, res) => {
  try {
    const filter = { auctionId: req.params.id };
    if (req.query.playerId) filter.playerId = req.query.playerId;
    const bids = await Bid.find(filter).sort({ timestamp: -1 }).limit(50);
    res.json({ success: true, bids });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── RTM ────────────────────────────────────────────────────────────────────

router.post('/:id/rtm', async (req, res) => {
  try {
    const { playerId, teamId } = req.body;
    const auctionIdStr = String(req.params.id);
    
    // No-auth mode - require teamId to be provided
    if (!teamId) return res.status(400).json({ error: 'teamId is required' });
    
    const team = await Team.findOne({ auctionId: auctionIdStr, _id: teamId });
    if (!team) return res.status(404).json({ error: 'No team found' });
    if (team.rtmUsed >= team.rtmTotal) return res.status(400).json({ error: 'No RTM remaining' });
    
    const player = await Player.findById(playerId);
    if (!player || player.status !== 'sold') return res.status(400).json({ error: 'Not eligible' });
    if (player.teamId?.toString() === team._id.toString()) return res.status(400).json({ error: 'Already in team' });

    const rtm = new RTM({
      auctionId: req.params.id,
      playerId, 
      teamId: team._id,
      originalBid: player.soldPrice,
      expiresAt: new Date(Date.now() + 20000),
    });
    await rtm.save();
    res.json({ success: true, rtm, team });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── RESULTS ────────────────────────────────────────────────────────────────

// Enhanced post-auction results with full summary data
router.get('/:id/results', optionalAuth, async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id).populate('organizerId', 'name email');
    if (!auction) return res.status(404).json({ error: 'Auction not found' });
    const [teams, players, bids] = await Promise.all([
      Team.find({ auctionId: req.params.id }).populate('ownerId', 'name email'),
      Player.find({ auctionId: req.params.id }).populate('teamId', 'name shortName primaryColor'),
      Bid.find({ auctionId: req.params.id }).sort({ createdAt: -1 }),
    ]);
    const teamResults = teams.map(team => ({
      ...team.toObject(),
      players:   players.filter(p => p.teamId?._id?.toString() === team._id.toString()),
      spent:     team.initialPurse - team.purse,
      soldCount: players.filter(p => p.teamId?._id?.toString() === team._id.toString() && p.status === 'sold').length,
    }));
    const summary = {
      totalPlayers:  players.length,
      soldPlayers:   players.filter(p => p.status === 'sold').length,
      unsoldPlayers: players.filter(p => p.status === 'unsold').length,
      totalBids:     bids.length,
      totalRevenue:  players.filter(p => p.status === 'sold').reduce((s, p) => s + (p.soldPrice || 0), 0),
      topTeam: [...teamResults].sort((a, b) => b.soldCount - a.soldCount)[0]?.name || '',
    };
    res.json({ success: true, auction, teams: teamResults, players, bids, summary });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── SCHEDULED START ────────────────────────────────────────────
router.post('/:id/schedule', async (req, res) => {
  try {
    const { scheduledAt } = req.body;
    if (!scheduledAt) return res.status(400).json({ error: 'scheduledAt required' });
    const schedDate = new Date(scheduledAt);
    if (schedDate <= new Date()) return res.status(400).json({ error: 'Must be in the future' });
    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });
    // No-auth mode - allow scheduling by anyone
    await Auction.findByIdAndUpdate(req.params.id, { scheduledAt: schedDate, status: 'scheduled' });
    const io = req.app.get('io');
    if (io) io.emit('auctionScheduled', { auctionId: req.params.id, scheduledAt: schedDate });
    res.json({ success: true, scheduledAt: schedDate });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id/schedule', async (req, res) => {
  try {
    await Auction.findByIdAndUpdate(req.params.id, { scheduledAt: null, status: 'draft' });
    const io = req.app.get('io');
    if (io) io.emit('auctionStatusChanged', { auctionId: req.params.id, status: 'draft' });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── BROADCAST VIEWER MODE ─────────────────────────────────────
router.post('/:id/broadcast', async (req, res) => {
  try {
    // Broadcast screen check removed - Beast Cricket now operates as a completely free, fully unlocked platform
    // All features including broadcast screen are available to all users
    const { enabled } = req.body;
    const auction = await Auction.findByIdAndUpdate(req.params.id, { broadcastEnabled: !!enabled }, { new: true });
    const io = req.app.get('io');
    if (io) io.to(req.params.id).emit('broadcastToggled', { enabled: !!enabled });
    res.json({ success: true, broadcastEnabled: auction.broadcastEnabled });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id/broadcast', async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });
    if (!auction.broadcastEnabled) return res.status(403).json({ error: 'Broadcast not enabled' });
    const [teams, currentPlayer, bids] = await Promise.all([
      Team.find({ auctionId: req.params.id }).lean(),
      auction.currentPlayerId ? Player.findById(auction.currentPlayerId) : null,
      Bid.find({ auctionId: req.params.id }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);
    res.json({ success: true, auction: { _id: auction._id, name: auction.name, status: auction.status, bidTimer: auction.bidTimer }, currentPlayer, teams, recentBids: bids });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CSV EXPORTS ───────────────────────────────────────────────
router.get('/:id/export/players', async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });
    const players = await Player.find({ auctionId: req.params.id }).populate('teamId', 'name').lean();
    const header = 'Name,Role,Category,Nationality,Age,Base Price,Sold Price,Status,Team,Matches,Runs,Wickets\n';
    const body = players.map(p =>
      [p.name, p.role, p.category, p.nationality || '', p.age || '', p.basePrice, p.soldPrice || '', p.status, p.teamId?.name || '', p.stats?.matches || 0, p.stats?.runs || 0, p.stats?.wickets || 0]
      .map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(',') 
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=players.csv`);
    res.send(header + body);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id/export/teams', async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });
    const teams = await Team.find({ auctionId: req.params.id }).lean();
    const header = 'Team Name,Short Name,Owner,City,Initial Purse,Remaining Purse,Spent,Players\n';
    const body = teams.map(t =>
      [t.name, t.shortName, t.ownerName || '', t.city || '', t.initialPurse, t.purse, t.initialPurse - t.purse, t.playersCount]
      .map(v => `"${String(v ?? '')}"`).join(',')
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=teams.csv`);
    res.send(header + body);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

// ─────────────────────────────────────────────────────────────────────────────
// BULK IMPORT PLAYERS — CSV/JSON upload
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/players/bulk-import', upload.single('file'), async (req, res) => {
  try {
    // Bulk import check removed - Beast Cricket now operates as a completely free, fully unlocked platform
    // All features including bulk import are available to all users
    const auctionId = req.params.id;
    const auction = await Auction.findById(auctionId);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });
    // No-auth mode - allow bulk import by anyone

    // Parse body JSON or CSV
    let rows = [];
    if (req.body.players) {
      // JSON import
      rows = typeof req.body.players === 'string' ? JSON.parse(req.body.players) : req.body.players;
    } else if (req.file) {
      // CSV import
      const csv = req.file.buffer ? req.file.buffer.toString() : require('fs').readFileSync(req.file.path).toString();
      const lines = csv.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
      rows = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const obj = {};
        headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
        return obj;
      });
    } else {
      return res.status(400).json({ error: 'Provide players JSON or CSV file' });
    }

    const valid = ['Batsman','Bowler','AllRounder','WicketKeeper','Other'];
    const cats  = ['Elite','Gold','Silver','Emerging'];
    const created = []; const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const name = r.name || r.Name || '';
      if (!name.trim()) { errors.push({ row: i+2, error: 'Name required' }); continue; }
      const role     = valid.includes(r.role || r.Role) ? (r.role || r.Role) : 'Batsman';
      const category = cats.includes(r.category || r.Category) ? (r.category || r.Category) : 'Silver';
      const basePrice = parseInt(r.baseprice || r['base price'] || r.basePrice || r.BasePrice || '500000') || 500000;
      try {
        const p = await Player.create({
          auctionId, name: name.trim(),
          role, category,
          nationality: r.nationality || r.Nationality || 'Indian',
          age: parseInt(r.age || r.Age) || 24,
          basePrice,
          status: 'active',  // Players are active when imported, ready for auction
          stats: {
            matches: parseInt(r.matches || 0) || 0,
            runs: parseInt(r.runs || 0) || 0,
            wickets: parseInt(r.wickets || 0) || 0,
          },
        });
        created.push(p);
      } catch(e) { errors.push({ row: i+2, name, error: e.message }); }
    }

    res.json({ success: true, imported: created.length, failed: errors.length, errors: errors.slice(0, 10) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// TEAM WALLET — credit/debit wallet (Pro/Elite)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/teams/:teamId/wallet', authenticate, authorize('organizer','admin'), async (req, res) => {
  try {
    // Team wallet check removed - Beast Cricket now operates as a completely free, fully unlocked platform
    // All features including team wallet are available to all users
    const { type, amount, note } = req.body;
    if (!['credit','debit'].includes(type)) return res.status(400).json({ error: 'type must be credit or debit' });
    const amt = parseInt(amount);
    if (!amt || amt <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    const newBalance = type === 'credit' ? team.walletBalance + amt : team.walletBalance - amt;
    if (newBalance < 0) return res.status(400).json({ error: 'Insufficient wallet balance' });

    const updated = await Team.findByIdAndUpdate(req.params.teamId, {
      walletBalance: newBalance,
      $push: { walletTransactions: { type, amount: amt, note: note || '', at: new Date() } },
    }, { new: true });
    res.json({ success: true, team: updated });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// WHATSAPP SHARE — generate wa.me links (Pro/Elite)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/whatsapp-share', authenticate, authorize('organizer','admin'), async (req, res) => {
  try {
    // WhatsApp notifications check removed - Beast Cricket now operates as a completely free, fully unlocked platform
    // All features including WhatsApp notifications are available to all users
    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });
    const baseUrl = req.headers.origin || 'https://beastcricket.com';
    const joinLink = `${baseUrl}/join/${auction.joinCode}`;
    const type = req.query.type || 'invite';
    let message = '';
    if (type === 'invite') {
      message = `🏏 *${auction.name}* — You're invited!\n\nJoin Code: *${auction.joinCode}*\nJoin Link: ${joinLink}\n\nRegister your team now and get ready to bid!`;
    } else if (type === 'reminder') {
      message = `🔔 *Auction Reminder: ${auction.name}*\n\nThe auction starts soon!\nJoin Code: *${auction.joinCode}*\nLink: ${joinLink}`;
    } else if (type === 'result') {
      message = `🏆 *${auction.name} — Auction Complete!*\n\nThe auction has ended. Check final results at: ${joinLink}`;
    }
    const waLink = `https://wa.me/?text=${encodeURIComponent(message)}`;
    res.json({ success: true, message, waLink, joinLink, joinCode: auction.joinCode });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
