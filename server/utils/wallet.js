'use strict';
// ═══════════════════════════════════════════════════════════════
// WALLET HELPERS — credit/debit organizer wallet
// ═══════════════════════════════════════════════════════════════
const OrganizerWallet = require('../models/Wallet');

/**
 * Credit the organizer's wallet after a player/team fee payment.
 * Idempotent: skips if reference (paymentId) already recorded.
 */
const creditWallet = async ({ organizerId, amount, type, description, auctionId, paymentId }) => {
  try {
    // Check for duplicate credit using paymentId as idempotency key
    if (paymentId) {
      const existing = await OrganizerWallet.findOne({
        organizerId,
        'transactions.paymentId': paymentId,
      });
      if (existing) {
        console.log(`⚠️  Wallet: duplicate credit skipped for paymentId=${paymentId}`);
        return;
      }
    }

    await OrganizerWallet.findOneAndUpdate(
      { organizerId },
      {
        $inc: { totalEarnings: amount, availableBalance: amount },
        $push: {
          transactions: {
            type,
            amount,
            currency: 'INR',
            reference: paymentId || '',
            description,
            auctionId: auctionId || null,
            paymentId: paymentId || '',
            status: 'settled',
            settledAt: new Date(),
          },
        },
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Wallet credited ₹${(amount/100).toFixed(2)} for organizer ${organizerId}`);
  } catch (err) {
    console.error('⚠️  Wallet credit failed (non-fatal):', err.message);
  }
};

/**
 * Debit the wallet for a payout or refund.
 */
const debitWallet = async ({ organizerId, amount, type, description, reference }) => {
  try {
    const wallet = await OrganizerWallet.findOne({ organizerId });
    if (!wallet || wallet.availableBalance < amount) {
      throw new Error('Insufficient wallet balance');
    }
    await OrganizerWallet.findOneAndUpdate(
      { organizerId },
      {
        $inc: { availableBalance: -amount, totalWithdrawn: type === 'payout_debit' ? amount : 0 },
        $push: {
          transactions: {
            type,
            amount: -amount,
            reference: reference || '',
            description,
            status: 'settled',
            settledAt: new Date(),
          },
        },
      },
      { new: true }
    );
    console.log(`✅ Wallet debited ₹${(amount/100).toFixed(2)} for organizer ${organizerId}`);
  } catch (err) {
    console.error('⚠️  Wallet debit failed:', err.message);
    throw err;
  }
};

module.exports = { creditWallet, debitWallet };
