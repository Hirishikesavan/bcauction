'use strict';
// ═══════════════════════════════════════════════════════════════
// ADMIN ROUTES — Complete Super Admin Panel
// All routes guarded: authenticate + authorize('admin') + email check
// ═══════════════════════════════════════════════════════════════
const express      = require('express');
const router       = express.Router();
const mongoose     = require('mongoose');
const User         = require('../models/User');
const Auction      = require('../models/Auction');
const Player       = require('../models/Player');
const Team         = require('../models/Team');
const Bid          = require('../models/Bid');
const Payment      = require('../models/Payment');
const ActivityLog  = require('../models/ActivityLog');
const OrganizerPackage = require('../models/OrganizerPackage');
const OrganizerProfile = require('../models/OrganizerProfile');
const { authenticate, authorize } = require('../middleware/auth');
const { log }      = require('../utils/logger');
const ioStore      = require('../socket/io');

const ADMIN_EMAILS  = (process.env.ADMIN_EMAIL || '').toLowerCase().split(',').map(e => e.trim());

// ── Admin Guard ───────────────────────────────────────────────
router.use(authenticate, authorize('admin'));
router.use((req, res, next) => {
  if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(req.user.email?.toLowerCase()))
    return res.status(403).json({ error: 'Access denied.' });
  next();
});

const pushAdminUpdate = (type, data) => {
  try {
    const io = ioStore.getIO();
    if (io) io.to('admin-room').emit('admin-update', { type, data, ts: new Date().toISOString() });
  } catch {}
};

// ═══════════════════════════════════════════════════════════════
// PLATFORM STATS
// ═══════════════════════════════════════════════════════════════
router.get('/stats', async (req, res) => {
  try {
    const now     = new Date();
    const dayAgo  = new Date(now - 24*60*60*1000);
    const weekAgo = new Date(now - 7*24*60*60*1000);
    const monthAgo= new Date(now - 30*24*60*60*1000);

    const [
      totalUsers, totalAuctions, totalPlayers, totalTeams, totalBids,
      activeAuctions, scheduledAuctions, completedAuctions,
      blockedUsers, unverifiedUsers,
      organizers, teamOwners, viewers, admins,
      loginsToday, failedToday, loginsWeek,
      registrationsToday, registrationsWeek, registrationsMonth,
      starterPlans, proPlans, elitePlans, activePlans,
      revenueTotal, revenueMonth,
    ] = await Promise.all([
      User.countDocuments(),
      Auction.countDocuments(),
      Player.countDocuments(),
      Team.countDocuments(),
      Bid.countDocuments(),
      Auction.countDocuments({ status: 'active' }),
      Auction.countDocuments({ status: 'scheduled' }),
      Auction.countDocuments({ status: 'completed' }),
      User.countDocuments({ isBlocked: true }),
      User.countDocuments({ isVerified: false }),
      User.countDocuments({ role: 'organizer' }),
      User.countDocuments({ role: 'team_owner' }),
      User.countDocuments({ role: 'viewer' }),
      User.countDocuments({ role: 'admin' }),
      ActivityLog.countDocuments({ type: 'login_success', createdAt: { $gte: dayAgo } }),
      ActivityLog.countDocuments({ type: 'login_failed',  createdAt: { $gte: dayAgo } }),
      ActivityLog.countDocuments({ type: 'login_success', createdAt: { $gte: weekAgo } }),
      ActivityLog.countDocuments({ type: 'register', createdAt: { $gte: dayAgo } }),
      ActivityLog.countDocuments({ type: 'register', createdAt: { $gte: weekAgo } }),
      ActivityLog.countDocuments({ type: 'register', createdAt: { $gte: monthAgo } }),
      OrganizerPackage.countDocuments({ packageType: 'starter' }),
      OrganizerPackage.countDocuments({ packageType: 'pro' }),
      OrganizerPackage.countDocuments({ packageType: 'elite' }),
      OrganizerPackage.countDocuments({ expiresAt: { $gte: now } }),
      Payment.aggregate([{ $match: { status: 'success' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]).then(r => r[0]?.total || 0),
      Payment.aggregate([{ $match: { status: 'success', createdAt: { $gte: monthAgo } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]).then(r => r[0]?.total || 0),
    ]);

    res.json({ success: true, stats: {
      users: { total: totalUsers, organizers, teamOwners, viewers, admins, blocked: blockedUsers, unverified: unverifiedUsers, newToday: registrationsToday, newThisWeek: registrationsWeek, newThisMonth: registrationsMonth },
      auctions: { total: totalAuctions, active: activeAuctions, scheduled: scheduledAuctions, completed: completedAuctions, players: totalPlayers, teams: totalTeams, bids: totalBids },
      subscriptions: { starter: starterPlans, pro: proPlans, elite: elitePlans, active: activePlans, expired: starterPlans + proPlans + elitePlans - activePlans },
      revenue: { total: revenueTotal, thisMonth: revenueMonth, totalFormatted: `₹${(revenueTotal/100).toFixed(2)}`, monthFormatted: `₹${(revenueMonth/100).toFixed(2)}` },
      activity: { loginsToday, failedToday, loginsWeek },
    }});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// ACTIVITY LOGS
// ═══════════════════════════════════════════════════════════════
router.get('/activity', async (req, res) => {
  try {
    const { type, limit = 50, page = 1, since, search } = req.query;
    const filter = {};
    if (type)   filter.type = type;
    if (since)  filter.createdAt = { $gt: new Date(since) };
    if (search) filter.$or = [
      { userName: { $regex: search, $options: 'i' } },
      { userEmail: { $regex: search, $options: 'i' } },
      { details: { $regex: search, $options: 'i' } },
    ];
    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      ActivityLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      ActivityLog.countDocuments(filter),
    ]);
    res.json({ success: true, logs, total, pages: Math.ceil(total / Number(limit)) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// USER MANAGEMENT
// ═══════════════════════════════════════════════════════════════
router.get('/users', async (req, res) => {
  try {
    const { search, role, status, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
    if (role)   filter.role = role;
    if (status === 'blocked')    filter.isBlocked = true;
    if (status === 'unverified') filter.isVerified = false;
    if (status === 'active')     { filter.isBlocked = false; filter.isVerified = true; }
    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
        .select('-password -refreshToken -verificationToken -resetToken -verificationTokenExpiry -resetTokenExpiry'),
      User.countDocuments(filter),
    ]);
    // Attach package info for organizers
    const userIds = users.filter(u => u.role === 'organizer').map(u => u._id);
    // FIXED: query by string IDs (Better Auth) - convert all to strings
    const userIdStrings = userIds.map(id => String(id));
    const packages = await OrganizerPackage.find({ organizerId: { $in: userIdStrings } }).lean();
    const pkgMap = {};
    packages.forEach(p => { pkgMap[p.organizerId.toString()] = p; });
    const enriched = users.map(u => {
      const obj = u.toObject();
      if (u.role === 'organizer') obj.package = pkgMap[u._id.toString()] || null;
      return obj;
    });
    res.json({ success: true, users: enriched, total, pages: Math.ceil(total / Number(limit)) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -refreshToken -verificationToken -resetToken');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const pkg = user.role === 'organizer'
      ? await OrganizerPackage.findOne({ organizerId: user.id || String(user._id) })
      : null;
    const lastLogin = await ActivityLog.findOne({ userId: user._id, type: 'login_success' })
      .sort({ createdAt: -1 }).select('createdAt ip');
    const auctions = user.role === 'organizer'
      ? await Auction.find({ organizerId: user._id }).select('name status date').sort({ createdAt: -1 }).limit(5)
      : [];
    res.json({ success: true, user: { ...user.toObject(), package: pkg, lastLogin, recentAuctions: auctions } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/users/:id/block', async (req, res) => {
  try {
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ error: 'User not found.' });
    if (u.email === ADMIN_EMAIL) return res.status(400).json({ error: 'Cannot modify admin.' });
    u.isBlocked = !u.isBlocked;
    await u.save();
    await log('admin_action', req, { details: `${u.isBlocked ? 'Blocked' : 'Unblocked'} user: ${u.email}` });
    pushAdminUpdate('user-updated', { userId: u._id });
    res.json({ success: true, user: u });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/users/:id/verify', async (req, res) => {
  try {
    const u = await User.findByIdAndUpdate(req.params.id,
      { $set: { isVerified: true }, $unset: { verificationToken: 1, verificationTokenExpiry: 1 } },
      { new: true }
    );
    if (!u) return res.status(404).json({ error: 'User not found.' });
    await log('admin_action', req, { details: `Force-verified: ${u.email}` });
    pushAdminUpdate('user-updated', { userId: u._id });
    res.json({ success: true, user: u });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['organizer', 'team_owner', 'viewer'].includes(role))
      return res.status(400).json({ error: 'Invalid role.' });
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ error: 'User not found.' });
    if (u.email === ADMIN_EMAIL) return res.status(400).json({ error: 'Cannot change admin role.' });
    await User.findByIdAndUpdate(req.params.id, { $set: { role } });
    await log('admin_action', req, { details: `Changed ${u.email} role → ${role}` });
    pushAdminUpdate('user-updated', { userId: u._id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ error: 'User not found.' });
    if (u.email === ADMIN_EMAIL) return res.status(400).json({ error: 'Cannot delete admin.' });
    await User.findByIdAndDelete(req.params.id);
    await log('admin_action', req, { details: `Deleted user: ${u.email}` });
    pushAdminUpdate('user-deleted', { userId: u._id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// ORGANIZER MANAGEMENT
// ═══════════════════════════════════════════════════════════════
router.get('/organizers', async (req, res) => {
  try {
    const { search, plan, status, page = 1, limit = 50 } = req.query;
    const userFilter = { role: 'organizer' };
    if (search) userFilter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
    const skip = (Number(page) - 1) * Number(limit);
    const [organizers, total] = await Promise.all([
      User.find(userFilter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
        .select('-password -refreshToken -verificationToken -resetToken'),
      User.countDocuments(userFilter),
    ]);
    const ids = organizers.map(o => o._id);
    const [packages, profiles, auctionCounts] = await Promise.all([
      OrganizerPackage.find({ organizerId: { $in: ids.map(id => String(id)) } }).lean(),
      OrganizerProfile.find({ organizerId: { $in: ids } }).lean(),
      Auction.aggregate([{ $match: { organizerId: { $in: ids } } }, { $group: { _id: '$organizerId', count: { $sum: 1 } } }]),
    ]);
    const pkgMap = {}; packages.forEach(p => { pkgMap[p.organizerId.toString()] = p; });
    const profMap = {}; profiles.forEach(p => { profMap[p.organizerId.toString()] = p; });
    const countMap = {}; auctionCounts.forEach(c => { countMap[c._id.toString()] = c.count; });
    const enriched = organizers.map(o => ({
      ...o.toObject(),
      package: pkgMap[o._id.toString()] || null,
      profile: profMap[o._id.toString()] || null,
      auctionCount: countMap[o._id.toString()] || 0,
    }));
    // Filter by plan if requested
    const filtered = plan ? enriched.filter(o => o.package?.packageType === plan) : enriched;
    res.json({ success: true, organizers: filtered, total, pages: Math.ceil(total / Number(limit)) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/organizers/:id/plan', async (req, res) => {
  try {
    const { packageType } = req.body;
    if (!['starter', 'pro', 'elite'].includes(packageType))
      return res.status(400).json({ error: 'Invalid plan type.' });
    const { PLANS } = require('../middleware/subscription');
    const plan = PLANS[packageType];
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    const pkg = await OrganizerPackage.findOneAndUpdate(
      { organizerId: req.params.id },
      { packageType, auctionsAllowed: plan.auctionsPerYear === Infinity ? 999 : plan.auctionsPerYear, auctionsUsed: 0, purchasedAt: new Date(), expiresAt, amountPaid: plan.price },
      { upsert: true, new: true }
    );
    await log('admin_action', req, { details: `Changed org ${req.params.id} plan → ${packageType}` });
    res.json({ success: true, package: pkg });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// PAYMENT MANAGEMENT
// ═══════════════════════════════════════════════════════════════
router.get('/payments', async (req, res) => {
  try {
    const { status, type, search, page = 1, limit = 50, from, to } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type)   filter.type   = type;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(to);
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [payments, total, revenue] = await Promise.all([
      Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
        .populate('organizerId', 'name email')
        .populate('auctionId', 'name')
        .lean(),
      Payment.countDocuments(filter),
      Payment.aggregate([
        { $match: { ...filter, status: 'success' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]).then(r => r[0]?.total || 0),
    ]);
    // Search by organizer name/email
    let result = payments;
    if (search) {
      const s = search.toLowerCase();
      result = payments.filter(p =>
        p.organizerId?.name?.toLowerCase().includes(s) ||
        p.organizerId?.email?.toLowerCase().includes(s) ||
        p.razorpayPaymentId?.toLowerCase().includes(s)
      );
    }
    res.json({ success: true, payments: result, total, pages: Math.ceil(total / Number(limit)), totalRevenue: revenue });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/payments/:id', async (req, res) => {
  try {
    const p = await Payment.findById(req.params.id)
      .populate('organizerId', 'name email')
      .populate('auctionId', 'name');
    if (!p) return res.status(404).json({ error: 'Payment not found.' });
    res.json({ success: true, payment: p });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/payments/:id/refund', async (req, res) => {
  try {
    const { reason } = req.body;
    const p = await Payment.findByIdAndUpdate(req.params.id,
      { $set: { status: 'refunded', refundedAt: new Date(), refundReason: reason || '' } },
      { new: true }
    );
    if (!p) return res.status(404).json({ error: 'Payment not found.' });
    await log('admin_action', req, { details: `Refunded payment ${p.razorpayPaymentId || p._id}. Reason: ${reason}` });
    res.json({ success: true, payment: p });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// BANK DETAILS MANAGEMENT
// ═══════════════════════════════════════════════════════════════
router.get('/bank-details', async (req, res) => {
  try {
    const profiles = await OrganizerProfile.find().populate('organizerId', 'name email').lean();
    // Mask account numbers
    const masked = profiles.map(p => ({
      ...p,
      accountNumber: p.accountNumber
        ? 'XXXXXX' + p.accountNumber.slice(-4)
        : '',
    }));
    res.json({ success: true, profiles: masked });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// SUBSCRIPTION ANALYTICS
// ═══════════════════════════════════════════════════════════════
router.get('/subscription-analytics', async (req, res) => {
  try {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      return { year: d.getFullYear(), month: d.getMonth() };
    }).reverse();

    const [revenueByMonth, planDist, activeCount, expiredCount] = await Promise.all([
      Promise.all(months.map(async ({ year, month }) => {
        const start = new Date(year, month, 1);
        const end   = new Date(year, month + 1, 1);
        const r = await Payment.aggregate([
          { $match: { status: 'success', createdAt: { $gte: start, $lt: end } } },
          { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        ]);
        return { label: start.toLocaleString('en-IN', { month: 'short', year: '2-digit' }), revenue: r[0]?.total || 0, count: r[0]?.count || 0 };
      })),
      OrganizerPackage.aggregate([
        { $group: { _id: '$packageType', count: { $sum: 1 } } }
      ]),
      OrganizerPackage.countDocuments({ expiresAt: { $gte: now } }),
      OrganizerPackage.countDocuments({ expiresAt: { $lt: now } }),
    ]);

    res.json({ success: true, analytics: { revenueByMonth, planDistribution: planDist, activeSubs: activeCount, expiredSubs: expiredCount } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// AUCTION MANAGEMENT
// ═══════════════════════════════════════════════════════════════
router.get('/auctions', async (req, res) => {
  try {
    const { status, page = 1, limit = 50, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) filter.name = { $regex: search, $options: 'i' };
    const skip = (Number(page) - 1) * Number(limit);
    const [auctions, total] = await Promise.all([
      Auction.find(filter).populate('organizerId', 'name email').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Auction.countDocuments(filter),
    ]);
    // Enrich with counts
    const enriched = await Promise.all(auctions.map(async (a) => {
      const [playerCount, teamCount, bidCount] = await Promise.all([
        Player.countDocuments({ auctionId: a._id }),
        Team.countDocuments({ auctionId: a._id }),
        Bid.countDocuments({ auctionId: a._id }),
      ]);
      return { ...a.toObject(), playerCount, teamCount, bidCount };
    }));
    res.json({ success: true, auctions: enriched, total, pages: Math.ceil(total / Number(limit)) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/auctions/analytics', async (req, res) => {
  try {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now); d.setMonth(d.getMonth() - i);
      return { year: d.getFullYear(), month: d.getMonth() };
    }).reverse();
    const auctionsByMonth = await Promise.all(months.map(async ({ year, month }) => {
      const start = new Date(year, month, 1), end = new Date(year, month + 1, 1);
      const count = await Auction.countDocuments({ createdAt: { $gte: start, $lt: end } });
      return { label: start.toLocaleString('en-IN', { month: 'short', year: '2-digit' }), count };
    }));
    const [soldPlayers, totalPlayers] = await Promise.all([
      Player.countDocuments({ status: 'sold' }),
      Player.countDocuments(),
    ]);
    res.json({ success: true, analytics: { auctionsByMonth, soldPlayers, unsoldPlayers: totalPlayers - soldPlayers, totalPlayers } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/auctions/:id', async (req, res) => {
  try {
    const a = await Auction.findById(req.params.id);
    if (!a) return res.status(404).json({ error: 'Auction not found.' });
    await Promise.all([
      Auction.findByIdAndDelete(req.params.id),
      Player.deleteMany({ auctionId: req.params.id }),
      Team.deleteMany({ auctionId: req.params.id }),
      Bid.deleteMany({ auctionId: req.params.id }),
    ]);
    await log('admin_action', req, { details: `Deleted auction: ${a.name}` });
    pushAdminUpdate('auction-deleted', { auctionId: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// EXPORTS — CSV
// ═══════════════════════════════════════════════════════════════
const toCSV = (rows, cols) => {
  const header = cols.map(c => c.label).join(',');
  const body = rows.map(row =>
    cols.map(c => {
      const v = c.get ? c.get(row) : (row[c.key] ?? '');
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(',')
  ).join('\n');
  return header + '\n' + body;
};

router.get('/export/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 })
      .select('name email role isVerified isBlocked createdAt');
    const csv = toCSV(users.map(u => u.toObject()), [
      { label: 'Name',           key: 'name' },
      { label: 'Email',          key: 'email' },
      { label: 'Role',           key: 'role' },
      { label: 'Verified',       get: r => r.isVerified ? 'Yes' : 'No' },
      { label: 'Blocked',        get: r => r.isBlocked  ? 'Yes' : 'No' },
      { label: 'Registered',     get: r => new Date(r.createdAt).toLocaleDateString('en-IN') },
    ]);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
    res.send(csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/export/payments', async (req, res) => {
  try {
    const payments = await Payment.find({ status: 'success' }).sort({ createdAt: -1 })
      .populate('organizerId', 'name email').lean();
    const csv = toCSV(payments, [
      { label: 'Transaction ID',    key: 'razorpayPaymentId' },
      { label: 'Date',              get: r => new Date(r.createdAt).toLocaleDateString('en-IN') },
      { label: 'Organizer Name',    get: r => r.organizerId?.name || '' },
      { label: 'Organizer Email',   get: r => r.organizerId?.email || '' },
      { label: 'Plan',              key: 'packageType' },
      { label: 'Type',              key: 'type' },
      { label: 'Amount (₹)',        get: r => (r.amount / 100).toFixed(2) },
      { label: 'Status',            key: 'status' },
    ]);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=payments.csv');
    res.send(csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/export/auctions', async (req, res) => {
  try {
    const auctions = await Auction.find().sort({ createdAt: -1 })
      .populate('organizerId', 'name email').lean();
    const csv = toCSV(auctions, [
      { label: 'Name',       key: 'name' },
      { label: 'Status',     key: 'status' },
      { label: 'Organizer',  get: r => r.organizerId?.name || '' },
      { label: 'Email',      get: r => r.organizerId?.email || '' },
      { label: 'Date',       get: r => new Date(r.date).toLocaleDateString('en-IN') },
      { label: 'Join Code',  key: 'joinCode' },
      { label: 'Created',    get: r => new Date(r.createdAt).toLocaleDateString('en-IN') },
    ]);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=auctions.csv');
    res.send(csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/export/revenue', async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = { status: 'success' };
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(to);
    }
    const payments = await Payment.find(filter).sort({ createdAt: -1 })
      .populate('organizerId', 'name email').lean();
    const csv = toCSV(payments, [
      { label: 'Date',         get: r => new Date(r.createdAt).toLocaleDateString('en-IN') },
      { label: 'Organizer',    get: r => r.organizerId?.name || '' },
      { label: 'Plan',         key: 'packageType' },
      { label: 'Amount (₹)',   get: r => (r.amount / 100).toFixed(2) },
      { label: 'Gateway',      get: r => r.isDevMode ? 'Dev Mode' : 'Razorpay' },
    ]);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=revenue.csv');
    res.send(csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: GRANT PLAN TO ORGANIZER (FREE — no payment)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/grant-plan', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { email, plan, days } = req.body;
    if (!email || !plan || !['starter','pro','elite'].includes(plan)) {
      return res.status(400).json({ error: 'Valid email and plan (starter/pro/elite) required' });
    }
    const OrganizerPackage = require('../models/OrganizerPackage');
    const PLAN_LIMITS = { starter: 3, pro: 15, elite: 999999 };

    // FIXED: Use Better Auth DB (string IDs) not legacy Mongoose User model
    const { getDb, getAuth } = require('../lib/auth');
    const baDb = getDb();
    const baUser = await baDb.collection('user').findOne({ email: email.trim().toLowerCase() });
    if (!baUser) return res.status(404).json({ error: `No user found with email: ${email}` });
    const targetUserId = baUser.id || String(baUser._id);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (parseInt(days) || 365));

    const existing = await OrganizerPackage.findOne({ organizerId: targetUserId });
    let pkg;
    if (existing) {
      pkg = await OrganizerPackage.findOneAndUpdate(
        { organizerId: targetUserId },
        {
          packageType: plan,
          auctionsAllowed: PLAN_LIMITS[plan],
          auctionsUsed: 0,
          expiresAt,
          paymentId: `ADMIN_GRANT_${req.user.id}`,
          orderId: `ADMIN_${Date.now()}`,
          amountPaid: 0,
          grantedByAdmin: true,
          grantedAt: new Date(),
        },
        { new: true }
      );
    } else {
      pkg = await OrganizerPackage.create({
        organizerId: targetUserId,
        packageType: plan,
        auctionsAllowed: PLAN_LIMITS[plan],
        expiresAt,
        paymentId: `ADMIN_GRANT_${req.user.id}`,
        orderId: `ADMIN_${Date.now()}`,
        amountPaid: 0,
        grantedByAdmin: true,
        grantedAt: new Date(),
      });
    }

    // Promote user to organizer if they're not already admin
    // ALWAYS promote — package ownership means organizer role, regardless of current role
    try {
      if (baUser.role !== 'admin') {
        // Update raw Better Auth 'user' collection (this is what the server reads on every request)
        await baDb.collection('user').updateOne(
          { id: targetUserId },
          { $set: { role: 'organizer' } }
        );
        // No-auth mode - skip Better Auth API calls
        console.log(`✅ [grant-plan] Set ${email} role → organizer (no-auth mode)`);
      }
    } catch(e) { console.warn('Role promotion after admin grant (non-fatal):', e.message); }

    // Save payment record so admin payment history shows admin-granted plans
    try {
      const PLAN_PRICES = { starter: 299900, pro: 599900, elite: 999900 };
      await Payment.create({
        organizerId: targetUserId,
        type: 'package_purchase',
        packageType: plan,
        razorpayOrderId: `ADMIN_GRANT_${Date.now()}`,
        razorpayPaymentId: `ADMIN_${req.user.id}_${Date.now()}`,
        amount: PLAN_PRICES[plan] || 0,
        currency: 'INR',
        status: 'success',
        notes: `Admin granted ${plan} plan to ${email} for ${days || 365} days`,
        isDevMode: false,
      });
    } catch(e) { console.warn('Payment record save failed (non-fatal):', e.message); }

    // Emit socket event to notify client to refresh
    try {
      const io = ioStore.getIO();
      if (io) {
        io.to(`user_${targetUserId}`).emit('package-granted', { 
          packageType: plan, 
          expiresAt: expiresAt.toISOString(),
          message: `${plan.charAt(0).toUpperCase() + plan.slice(1)} plan granted by admin`
        });
      }
    } catch(e) { console.warn('Failed to emit package-granted event:', e.message); }

    // Log the action
    try {
      const ActivityLog = require('../models/ActivityLog');
      await ActivityLog.create({
        userId: req.user.id, userName: req.user.name, userEmail: req.user.email,
        type: 'admin_grant_plan',
        details: `Admin granted ${plan} plan to ${email} for ${days || 365} days`,
      });
    } catch(e) {}

    return res.json({
      success: true,
      message: `${plan.charAt(0).toUpperCase() + plan.slice(1)} plan granted to ${email} — valid for ${days || 365} days (expires ${expiresAt.toLocaleDateString('en-IN')})`,
      package: pkg,
    });
  } catch(err) { res.status(500).json({ error: err.message }); }
});

// ── ADMIN: PAYOUT REQUESTS ───────────────────────────────────
// GET /api/admin/payouts — list all payout requests
router.get('/payouts', authenticate, authorize('admin'), async (req, res) => {
  try {
    const PayoutRequest = require('../models/PayoutRequest');
    const requests = await PayoutRequest.find().sort({ createdAt: -1 }).limit(100).lean();
    return res.json({ success: true, requests });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/admin/payouts/:id — approve or reject a payout request
router.patch('/payouts/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const PayoutRequest = require('../models/PayoutRequest');
    const { status, adminNote, razorpayPayoutId } = req.body;
    if (!['processing','completed','rejected'].includes(status))
      return res.status(400).json({ error: 'Invalid status' });

    const request = await PayoutRequest.findByIdAndUpdate(
      req.params.id,
      { status, adminNote: adminNote || '', razorpayPayoutId: razorpayPayoutId || '', processedAt: new Date(), processedBy: req.user.id },
      { new: true }
    );
    if (!request) return res.status(404).json({ error: 'Payout request not found' });

    // Debit wallet if completed
    if (status === 'completed') {
      const { debitWallet } = require('../utils/wallet');
      await debitWallet({
        organizerId: request.organizerId,
        amount:      request.amount,
        type:        'payout_debit',
        description: `Payout processed by admin`,
        reference:   razorpayPayoutId || request._id.toString(),
      }).catch(e => console.error('Wallet debit failed:', e.message));
    }

    return res.json({ success: true, request });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── ADMIN: ALL INVOICES ───────────────────────────────────────
router.get('/invoices', authenticate, authorize('admin'), async (req, res) => {
  try {
    const Invoice = require('../models/Invoice');
    const invoices = await Invoice.find().sort({ createdAt: -1 }).limit(200).lean();
    return res.json({ success: true, invoices });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── ADMIN: ORGANIZER WALLET OVERVIEW ─────────────────────────
router.get('/wallets', authenticate, authorize('admin'), async (req, res) => {
  try {
    const OrganizerWallet = require('../models/Wallet');
    const wallets = await OrganizerWallet.find().sort({ totalEarnings: -1 }).limit(100).lean();
    return res.json({ success: true, wallets });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


module.exports = router;
