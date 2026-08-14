// ════════════════════════════════════════════════════════════════════════════
// PAYMENT ROUTES — Production Razorpay integration
//
// Routes:
//  POST /api/payment/create-order            → player registration order
//  POST /api/payment/verify-and-register     → verify + register player
//  POST /api/payment/create-auction-order    → auction creation fee order
//  POST /api/payment/verify-and-create-auction → verify + create auction
//  POST /api/payment/create-team-fee-order   → team owner entry fee order
//  POST /api/payment/verify-team-fee         → verify team fee
//  POST /api/payment/webhook                 → Razorpay webhook handler
//  POST /api/payment/upload-image            → player photo upload
//  GET  /api/payment/invoice/:id             → fetch invoice
//  GET  /api/payment/invoices                → list user invoices
//  GET  /api/payment/wallet                  → organizer wallet summary
//  POST /api/payment/wallet/payout           → request payout
// ════════════════════════════════════════════════════════════════════════════
'use strict';

const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');

const Auction  = require('../models/Auction');
const Player   = require('../models/Player');
const Payment  = require('../models/Payment');
const OrganizerPackage = require('../models/OrganizerPackage');
const OrganizerProfile = require('../models/OrganizerProfile');
const Invoice  = require('../models/Invoice');
const OrganizerWallet  = require('../models/Wallet');
const PayoutRequest    = require('../models/PayoutRequest');

const { authenticate, authorize } = require('../middleware/auth');
const { getMulterStorage, getImageUrl } = require('../utils/cloudinary');
const rzpUtil  = require('../utils/razorpay');
const { createInvoice } = require('../utils/invoice');
const { creditWallet }  = require('../utils/wallet');

// ─── Multer setup ────────────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const storage = getMulterStorage(multer, uploadsDir);
const upload  = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /jpeg|jpg|png|gif|webp/.test(file.mimetype);
    cb(ok ? null : new Error('Only image files allowed'), ok);
  },
});

// ─── Idempotency helper ───────────────────────────────────────────────────────
// Prevent duplicate processing of the same payment (replay attacks / double-submit)
const isPaymentAlreadyProcessed = async (razorpayPaymentId) => {
  if (!razorpayPaymentId || razorpayPaymentId.startsWith('dev_')) return false;
  const exists = await Payment.findOne({ razorpayPaymentId });
  return !!exists;
};

// ─── Save payment record ──────────────────────────────────────────────────────
const savePayment = async (data) => {
  try {
    return await Payment.create(data);
  } catch (err) {
    if (err.code === 11000) {
      console.warn('⚠️  Duplicate payment record skipped:', data.razorpayPaymentId);
      return null;
    }
    console.error('⚠️  Payment record save failed (non-fatal):', err.message);
    return null;
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// WEBHOOK — must be raw body to verify HMAC signature
// Register this BEFORE express.json() middleware in server.js
// Razorpay Dashboard → Webhooks → URL: https://your-domain.com/api/payment/webhook
// ══════════════════════════════════════════════════════════════════════════════
router.post('/webhook',
  express.raw({ type: 'application/json' }),   // capture raw bytes for signature check
  async (req, res) => {
    const signature = req.headers['x-razorpay-signature'] || '';

    // Always respond 200 quickly to Razorpay (retry logic is on their side)
    res.status(200).json({ received: true });

    // Verify signature first
    if (!rzpUtil.verifyWebhookSignature(req.body, signature)) {
      console.warn('❌ Webhook: invalid signature — ignoring');
      return;
    }

    let event;
    try {
      event = JSON.parse(req.body.toString());
    } catch {
      console.error('❌ Webhook: failed to parse payload');
      return;
    }

    const eventType = event.event;
    console.log(`📩 Webhook received: ${eventType}`);

    try {
      // payment.captured — payment is confirmed and settled
      if (eventType === 'payment.captured') {
        const payment = event.payload.payment.entity;
        const { id: paymentId, order_id: orderId, amount, notes } = payment;

        // Idempotency: if we already processed this payment, skip
        if (await isPaymentAlreadyProcessed(paymentId)) {
          console.log(`⚠️  Webhook: payment ${paymentId} already processed — skipping`);
          return;
        }

        const paymentType = notes?.type || 'unknown';
        console.log(`✅ Webhook: payment.captured | id=${paymentId} | type=${paymentType}`);

        // Credit organizer wallet for player and team fees
        if (paymentType === 'player_registration' && notes?.auctionId) {
          const auction = await Auction.findById(notes.auctionId).select('organizerId name');
          if (auction) {
            await creditWallet({
              organizerId: auction.organizerId.toString(),
              amount,
              type: 'player_reg_credit',
              description: `Player registration fee — ${auction.name}`,
              auctionId: notes.auctionId,
              paymentId,
            });
          }
        }

        if (paymentType === 'team_owner_fee' && notes?.organizerId) {
          const auction = await Auction.findById(notes.auctionId).select('name').catch(() => null);
          await creditWallet({
            organizerId: notes.organizerId,
            amount,
            type: 'team_fee_credit',
            description: `Team owner entry fee — ${auction?.name || notes.auctionId}`,
            auctionId: notes.auctionId,
            paymentId,
          });
        }
      }

      // payment.failed — update any pending payment record
      if (eventType === 'payment.failed') {
        const payment = event.payload.payment.entity;
        await Payment.updateOne(
          { razorpayOrderId: payment.order_id },
          { $set: { status: 'failed' } }
        ).catch(() => {});
        console.log(`⚠️  Webhook: payment.failed | order=${payment.order_id}`);
      }

      // refund.created / refund.processed
      if (eventType === 'refund.created' || eventType === 'refund.processed') {
        const refund = event.payload.refund.entity;
        await Payment.updateOne(
          { razorpayPaymentId: refund.payment_id },
          { $set: { status: 'refunded', refundedAt: new Date() } }
        ).catch(() => {});
        await Invoice.updateOne(
          { razorpayPaymentId: refund.payment_id },
          { $set: { status: 'refunded' } }
        ).catch(() => {});
        console.log(`↩️  Webhook: ${eventType} | payment=${refund.payment_id}`);
      }

    } catch (err) {
      console.error('❌ Webhook processing error:', err.message);
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// PLAYER REGISTRATION PAYMENT
// ══════════════════════════════════════════════════════════════════════════════

// POST /api/payment/create-order
router.post('/create-order', async (req, res) => {
  try {
    const { auctionId, playerName } = req.body;
    if (!auctionId || !playerName?.trim())
      return res.status(400).json({ error: 'auctionId and playerName required' });

    const auction = await Auction.findById(auctionId);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });
    if (auction.status === 'completed')
      return res.status(400).json({ error: 'Auction has ended — registration closed' });

    // Slots check
    if (auction.maxRegistrations) {
      const registered = await Player.countDocuments({ auctionId, status: { $in: ['active','sold','unsold'] } });
      if (registered >= auction.maxRegistrations)
        return res.status(400).json({ error: 'Registration slots full' });
    }

    const feeInPaise = auction.registrationFee || 19900;

    if (!rzpUtil.isConfigured()) {
      console.log('⚠️  Razorpay not configured — returning dev order');
      return res.json({ success: true, ...rzpUtil.devOrder('reg', feeInPaise) });
    }

    const order = await rzpUtil.createOrder({
      amount:  feeInPaise,
      receipt: `reg_${auctionId}_${Date.now()}`.substring(0, 40),
      notes:   { auctionId, playerName: playerName.trim(), type: 'player_registration' },
    });

    console.log(`📋 Player reg order created: ${order.id} | ₹${feeInPaise/100} | ${rzpUtil.isLiveMode() ? 'LIVE' : 'TEST'}`);
    return res.json({
      success: true,
      devMode: false,
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      keyId:    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('❌ create-order:', err.message);
    return res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// POST /api/payment/verify-and-register
router.post('/verify-and-register', async (req, res) => {
  try {
    const {
      razorpay_order_id, razorpay_payment_id, razorpay_signature, devMode,
      auctionId, name, role, category, nationality, age, basePrice,
      matches, runs, wickets, average, strikeRate, imageUrl: uploadedImageUrl,
    } = req.body;

    if (!auctionId)    return res.status(400).json({ error: 'auctionId required' });
    if (!name?.trim()) return res.status(400).json({ error: 'Player name required' });

    const isDev = devMode === 'true' || devMode === true;

    if (!isDev) {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
        return res.status(400).json({ error: 'Payment data incomplete' });
      if (!rzpUtil.isConfigured())
        return res.status(500).json({ error: 'Payment gateway not configured on server' });

      // Duplicate payment check
      if (await isPaymentAlreadyProcessed(razorpay_payment_id))
        return res.status(409).json({ error: 'This payment has already been used for registration' });

      // Signature verification — all payment trust lives here
      if (!rzpUtil.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
        console.warn('❌ Signature mismatch for', razorpay_payment_id);
        return res.status(400).json({ error: 'Payment verification failed — invalid signature' });
      }

      // Optional: fetch from Razorpay to confirm payment is actually captured
      try {
        const rp = await rzpUtil.fetchPayment(razorpay_payment_id);
        if (rp.status !== 'captured' && rp.status !== 'authorized') {
          console.warn('❌ Payment not captured:', rp.status, razorpay_payment_id);
          return res.status(400).json({ error: `Payment not confirmed (status: ${rp.status})` });
        }
      } catch (fetchErr) {
        // Non-fatal: signature already verified, proceed even if fetch fails
        console.warn('⚠️  Razorpay fetch failed (proceeding after sig verify):', fetchErr.message);
      }

      console.log(`✅ Player payment verified: ${razorpay_payment_id} [${rzpUtil.isLiveMode() ? 'LIVE' : 'TEST'}]`);
    }

    const auction = await Auction.findById(auctionId);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    // Slot re-check under registration (race condition guard)
    if (auction.maxRegistrations) {
      const registered = await Player.countDocuments({ auctionId, status: { $in: ['active','sold','unsold'] } });
      if (registered >= auction.maxRegistrations)
        return res.status(400).json({ error: 'Registration slots just filled up — please try again' });
    }

    const player = new Player({
      auctionId,
      name:        name.trim(),
      role:        role        || 'Batsman',
      category:    category    || 'Gold',
      nationality: nationality || 'Indian',
      age:         age  ? parseInt(age,  10) : undefined,
      basePrice:   basePrice ? parseInt(basePrice, 10) : 1000000,
      imageUrl:    uploadedImageUrl || null,
      status:      'active',
      stats: {
        matches:    parseInt(matches,    10) || 0,
        runs:       parseInt(runs,       10) || 0,
        wickets:    parseInt(wickets,    10) || 0,
        average:    parseFloat(average)      || 0,
        strikeRate: parseFloat(strikeRate)   || 0,
        economy:    0,
      },
    });
    await player.save();

    // Save payment record (idempotent)
    await savePayment({
      organizerId: auction.organizerId.toString(),
      type: 'player_registration',
      razorpayOrderId:   razorpay_order_id  || 'dev',
      razorpayPaymentId: razorpay_payment_id || `dev_${Date.now()}`,
      amount: auction.registrationFee || 19900,
      currency: 'INR',
      status: 'success',
      auctionId: auction._id,
      playerName: name.trim(),
      isDevMode: isDev,
    });

    // Generate invoice
    const invoice = await createInvoice({
      userId:            'player',
      userName:          name.trim(),
      type:              'player_registration',
      description:       `Player Registration — ${auction.name}`,
      amount:            auction.registrationFee || 19900,
      razorpayOrderId:   razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      auctionId:         auctionId,
      organizerId:       auction.organizerId.toString(),
      isDevMode:         isDev,
    });

    // Credit organizer wallet (also done by webhook, but wallet.creditWallet is idempotent)
    if (!isDev && razorpay_payment_id) {
      await creditWallet({
        organizerId: auction.organizerId.toString(),
        amount:      auction.registrationFee || 19900,
        type:        'player_reg_credit',
        description: `Player registration — ${auction.name}`,
        auctionId:   auctionId,
        paymentId:   razorpay_payment_id,
      });
    }

    // Real-time broadcast
    const io = req.app.get('io');
    if (io) io.to(auctionId).emit('playerRegistered', { auctionId, player: player.toObject() });

    console.log(`✅ Player registered: ${player.name} | auction: ${auctionId}`);
    return res.status(201).json({
      success: true,
      player:  player.toObject(),
      invoiceNumber: invoice?.invoiceNumber || null,
    });
  } catch (err) {
    console.error('❌ verify-and-register:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// AUCTION CREATION PAYMENT
// ══════════════════════════════════════════════════════════════════════════════

// POST /api/payment/create-auction-order
router.post('/create-auction-order', authenticate, authorize('organizer', 'admin'), async (req, res) => {
  try {
    const feeInPaise = Math.max(100, Math.round(
      parseFloat(process.env.AUCTION_CREATION_FEE_PAISE || '49900')
    ));
    const { auctionName } = req.body;

    if (!rzpUtil.isConfigured()) {
      return res.json({ success: true, ...rzpUtil.devOrder('auction', feeInPaise) });
    }

    const order = await rzpUtil.createOrder({
      amount:  feeInPaise,
      receipt: `auction_${req.user.id}_${Date.now()}`.substring(0, 40),
      notes: {
        organizerId:   req.user.id.toString(),
        organizerName: req.user.name || '',
        auctionName:   (auctionName || 'New Auction').substring(0, 50),
        type:          'auction_creation',
      },
    });

    console.log(`📋 Auction creation order: ${order.id} for ${req.user.email}`);
    return res.json({
      success: true,
      devMode: false,
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      keyId:    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('❌ create-auction-order:', err.message);
    // Fall back to dev mode so organisers aren't blocked by gateway issues
    return res.json({
      success: true, devMode: true,
      ...rzpUtil.devOrder('auction', Math.max(100, parseInt(process.env.AUCTION_CREATION_FEE_PAISE || '49900', 10))),
    });
  }
});

// POST /api/payment/verify-and-create-auction
router.post('/verify-and-create-auction', authenticate, authorize('organizer', 'admin'), async (req, res) => {
  try {
    const {
      razorpay_order_id, razorpay_payment_id, razorpay_signature, devMode,
      name, description, date, bidTimer, bidIncrement,
      totalPursePerTeam, maxTeams, rtmEnabled, rtmPerTeam,
      registrationFee, registrationFeeEnabled,
    } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: 'Auction name required' });
    if (!date)         return res.status(400).json({ error: 'Auction date required' });

    // Package quota check removed - Beast Cricket now operates as a completely free, fully unlocked platform
    // All users can create auctions without any package requirement

    // Payment verification removed - Beast Cricket now operates as a completely free, fully unlocked platform
    // All users can create auctions without any payment requirement
    const isDev = devMode === 'true' || devMode === true;

    const feeEnabled = registrationFeeEnabled === 'true' || registrationFeeEnabled === true;
    const auction = new Auction({
      organizerId:            req.user.id,
      name:                   name.trim(),
      description:            description || '',
      date:                   new Date(date),
      bidTimer:               parseInt(bidTimer, 10)          || 30,
      bidIncrement:           parseInt(bidIncrement, 10)      || 500000,
      totalPursePerTeam:      parseInt(totalPursePerTeam, 10) || 100000000,
      maxTeams:               parseInt(maxTeams, 10)           || 10,
      rtmEnabled:             rtmEnabled !== 'false' && rtmEnabled !== false,
      rtmPerTeam:             parseInt(rtmPerTeam, 10)         || 2,
      registrationFee:        feeEnabled ? (parseInt(registrationFee, 10) || 19900) : 0,
      registrationFeeEnabled: feeEnabled,
    });
    await auction.save();

    // Payment saving and invoice creation removed - Beast Cricket now operates as a completely free, fully unlocked platform
    // No payment or invoice records needed for auction creation

    const io = req.app.get('io');
    if (io) {
      io.emit('auctionCreated', {
        auction: { _id: auction._id, name: auction.name, date: auction.date, status: auction.status, organizerId: req.user.id },
      });
    }

    console.log(`✅ Auction created: ${auction.name} | id: ${auction._id}`);
    return res.status(201).json({ success: true, auction });
  } catch (err) {
    console.error('❌ verify-and-create-auction:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// TEAM OWNER ENTRY FEE
// ══════════════════════════════════════════════════════════════════════════════

// POST /api/payment/create-team-fee-order
router.post('/create-team-fee-order', authenticate, async (req, res) => {
  try {
    const { auctionId } = req.body;
    if (!auctionId) return res.status(400).json({ error: 'auctionId required' });

    const auction = await Auction.findById(auctionId);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    if (!auction.teamOwnerFeeEnabled || !auction.teamOwnerFee) {
      return res.json({ success: true, feeRequired: false });
    }

    const profile    = await OrganizerProfile.findOne({ organizerId: auction.organizerId });
    const feeInPaise = Math.round((auction.teamOwnerFee || 0) * 100);

    // If organizer has their own Razorpay keys, use those (money goes directly to organizer)
    const useOrgKeys = profile?.razorpayKeyId && profile?.razorpayKeySecret;
    const keyId      = useOrgKeys ? profile.razorpayKeyId  : process.env.RAZORPAY_KEY_ID;
    const keySecret  = useOrgKeys ? profile.razorpayKeySecret : process.env.RAZORPAY_KEY_SECRET;
    const canCharge  = useOrgKeys || rzpUtil.isConfigured();

    if (!canCharge) {
      // UPI fallback
      return res.json({
        success: true, feeRequired: true, mode: 'upi',
        amount: feeInPaise,
        upiId:     profile?.upiId     || '',
        upiName:   profile?.upiName   || profile?.accountHolderName || '',
        qrCodeUrl: profile?.qrCodeUrl || '',
        whatsapp:  profile?.whatsapp  || '',
      });
    }

    const Razorpay = require('razorpay');
    const rz = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await rz.orders.create({
      amount:   feeInPaise,
      currency: 'INR',
      receipt:  `teamfee_${auctionId}_${Date.now()}`.substring(0, 40),
      notes: {
        auctionId,
        organizerId: auction.organizerId.toString(),
        type: 'team_owner_fee',
      },
    });

    return res.json({
      success: true, feeRequired: true, mode: 'razorpay',
      orderId:    order.id,
      amount:     order.amount,
      currency:   order.currency,
      keyId,
      ownAccount: useOrgKeys,
    });
  } catch (err) {
    console.error('❌ create-team-fee-order:', err.message);
    return res.json({ success: true, feeRequired: false, fallbackReason: 'Payment gateway error — contact organizer directly' });
  }
});

// POST /api/payment/verify-team-fee
router.post('/verify-team-fee', authenticate, async (req, res) => {
  try {
    const { auctionId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!auctionId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
      return res.status(400).json({ error: 'Payment data incomplete' });

    const auction = await Auction.findById(auctionId);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });

    if (await isPaymentAlreadyProcessed(razorpay_payment_id))
      return res.status(409).json({ error: 'This payment has already been used' });

    const profile = await OrganizerProfile.findOne({ organizerId: auction.organizerId });
    const secret  = (profile?.razorpayKeyId && profile?.razorpayKeySecret)
      ? profile.razorpayKeySecret
      : process.env.RAZORPAY_KEY_SECRET;

    if (!secret) return res.status(500).json({ error: 'Payment gateway not configured' });

    if (!rzpUtil.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, secret)) {
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    const feeInPaise = Math.round((auction.teamOwnerFee || 0) * 100);

    await savePayment({
      organizerId: auction.organizerId.toString(),
      type: 'team_owner_fee',
      razorpayOrderId:   razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      amount: feeInPaise,
      currency: 'INR',
      status: 'success',
      auctionId: auction._id,
      isDevMode: false,
    });

    await createInvoice({
      userId:            req.user.id,
      userName:          req.user.name || req.user.email,
      userEmail:         req.user.email,
      type:              'team_owner_fee',
      description:       `Team Entry Fee — ${auction.name}`,
      amount:            feeInPaise,
      razorpayOrderId:   razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      auctionId,
      organizerId:       auction.organizerId.toString(),
    });

    // Credit organizer wallet (if platform is the merchant; if ownAccount, organizer receives directly)
    const useOrgKeys = profile?.razorpayKeyId && profile?.razorpayKeySecret;
    if (!useOrgKeys) {
      await creditWallet({
        organizerId: auction.organizerId.toString(),
        amount:      feeInPaise,
        type:        'team_fee_credit',
        description: `Team owner entry fee — ${auction.name}`,
        auctionId,
        paymentId:   razorpay_payment_id,
      });
    }

    console.log(`✅ Team fee verified: ${razorpay_payment_id}`);
    return res.json({ success: true, verified: true, paymentId: razorpay_payment_id });
  } catch (err) {
    console.error('❌ verify-team-fee:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// INVOICES
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/payment/invoices  — list caller's invoices
router.get('/invoices', authenticate, async (req, res) => {
  try {
    const invoices = await Invoice.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return res.json({ success: true, invoices });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/payment/invoice/:id — single invoice by invoiceNumber or _id
router.get('/invoice/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findOne({
      $or: [{ invoiceNumber: id }, { _id: id.match(/^[0-9a-f]{24}$/) ? id : null }],
      userId: req.user.role === 'admin' ? undefined : req.user.id,
    }).lean();
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    return res.json({ success: true, invoice });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// ORGANIZER WALLET
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/payment/wallet
router.get('/wallet', authenticate, authorize('organizer', 'admin'), async (req, res) => {
  try {
    const wallet = await OrganizerWallet.findOne({ organizerId: req.user.id }).lean();
    return res.json({
      success: true,
      wallet: wallet || {
        organizerId: req.user.id,
        totalEarnings: 0, pendingBalance: 0, availableBalance: 0, totalWithdrawn: 0,
        transactions: [],
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/payment/wallet/payout — request a payout
router.post('/wallet/payout', authenticate, authorize('organizer'), async (req, res) => {
  try {
    const { amount, bankDetails } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const wallet = await OrganizerWallet.findOne({ organizerId: req.user.id });
    const available = wallet?.availableBalance || 0;
    if (amount > available)
      return res.status(400).json({ error: `Insufficient balance. Available: ₹${(available/100).toFixed(2)}` });

    const request = await PayoutRequest.create({
      organizerId:    req.user.id,
      organizerEmail: req.user.email,
      amount,
      bankDetails:    bankDetails || {},
      status: 'pending',
    });

    return res.json({ success: true, request, message: 'Payout request submitted. Admin will process within 2-3 business days.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// IMAGE UPLOAD (pre-payment, no auth required for player self-registration)
// ══════════════════════════════════════════════════════════════════════════════
router.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });
    const url = getImageUrl(req.file);
    if (!url) return res.status(500).json({ error: 'Failed to generate image URL' });
    console.log(`📸 Image uploaded: ${url}`);
    return res.json({ success: true, imageUrl: url });
  } catch (err) {
    console.error('❌ Upload error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
