'use strict';
// ═══════════════════════════════════════════════════════════════
// INVOICE GENERATOR — creates and saves Invoice records
// ═══════════════════════════════════════════════════════════════
const Invoice = require('../models/Invoice');

let _counter = 0;

/**
 * Generate a unique invoice number: BCPYYYYMMDD-NNNN
 */
const generateInvoiceNumber = () => {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  _counter = (_counter + 1) % 10000;
  const seq = String(Math.floor(Math.random() * 9000) + 1000 + _counter).slice(-4);
  return `BCP${date}-${seq}`;
};

/**
 * Create and save an invoice record.
 * Silently skips if a record with the same razorpayPaymentId already exists (idempotency).
 *
 * @param {Object} opts
 * @param {string} opts.userId
 * @param {string} opts.userName
 * @param {string} opts.userEmail
 * @param {'package_purchase'|'auction_creation'|'player_registration'|'team_owner_fee'} opts.type
 * @param {string} opts.description
 * @param {number} opts.amount         – in paise
 * @param {string} [opts.razorpayOrderId]
 * @param {string} [opts.razorpayPaymentId]
 * @param {string} [opts.auctionId]
 * @param {string} [opts.organizerId]
 * @param {string} [opts.packageType]
 * @param {boolean} [opts.isDevMode]
 * @returns {Promise<import('../models/Invoice')>}
 */
const createInvoice = async (opts) => {
  try {
    // Idempotency: don't duplicate invoices for the same payment
    if (opts.razorpayPaymentId && !opts.isDevMode) {
      const existing = await Invoice.findOne({ razorpayPaymentId: opts.razorpayPaymentId });
      if (existing) return existing;
    }

    const invoice = await Invoice.create({
      invoiceNumber:     generateInvoiceNumber(),
      userId:            opts.userId,
      userName:          opts.userName  || '',
      userEmail:         opts.userEmail || '',
      type:              opts.type,
      description:       opts.description,
      amount:            opts.amount,
      tax:               0,
      total:             opts.amount,
      currency:          'INR',
      razorpayOrderId:   opts.razorpayOrderId  || '',
      razorpayPaymentId: opts.razorpayPaymentId || '',
      auctionId:         opts.auctionId   || null,
      organizerId:       opts.organizerId || '',
      packageType:       opts.packageType || '',
      status:            'paid',
      isDevMode:         !!opts.isDevMode,
    });

    return invoice;
  } catch (err) {
    // Non-fatal: invoice creation failing must never block the payment confirmation
    console.error('⚠️  Invoice creation failed (non-fatal):', err.message);
    return null;
  }
};

module.exports = { createInvoice, generateInvoiceNumber };
