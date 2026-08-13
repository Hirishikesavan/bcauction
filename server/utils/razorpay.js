'use strict';
// ═══════════════════════════════════════════════════════════════
// RAZORPAY HELPERS — single source of truth for the entire app
// ═══════════════════════════════════════════════════════════════
const crypto = require('crypto');

/**
 * Returns true if production-grade Razorpay keys are set in env.
 * Rejects obvious placeholders so devs can't accidentally go live with test stubs.
 */
const isConfigured = () => {
  const id  = (process.env.RAZORPAY_KEY_ID  || '').trim();
  const sec = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  if (!id || !sec) return false;
  if (id.length < 14 || sec.length < 20) return false;
  if (id === 'rzp_test_xxxx' || sec === 'xxxx' || sec === 'your_key_secret') return false;
  return true;
};

/**
 * Returns true if the keys are LIVE (not test).
 * Used only for logging/warnings — live vs test keys are fully transparent to code.
 */
const isLiveMode = () => {
  const id = (process.env.RAZORPAY_KEY_ID || '').trim();
  return id.startsWith('rzp_live_');
};

/**
 * Creates and returns a Razorpay instance using env vars.
 * Throws if keys are not configured.
 */
const getInstance = () => {
  if (!isConfigured()) throw new Error('Razorpay not configured — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET');
  const Razorpay = require('razorpay');
  return new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID.trim(),
    key_secret: process.env.RAZORPAY_KEY_SECRET.trim(),
  });
};

/**
 * Verify Razorpay payment signature (HMAC-SHA256).
 * orderId + "|" + paymentId signed with the key_secret.
 * ALWAYS use the platform secret (or organizer's own secret for organizer-keyed orders).
 */
const verifySignature = (orderId, paymentId, signature, secret) => {
  const s = (secret || process.env.RAZORPAY_KEY_SECRET || '').trim();
  if (!s) return false;
  const expected = crypto
    .createHmac('sha256', s)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  // Use timingSafeEqual to prevent timing-based attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
};

/**
 * Verify Razorpay webhook signature.
 * rawBody (Buffer) signed with RAZORPAY_WEBHOOK_SECRET.
 */
const verifyWebhookSignature = (rawBody, signature) => {
  const secret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
  if (!secret) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
};

/**
 * Create a Razorpay order.
 * amount in paise, currency = 'INR'.
 * Returns Razorpay order object or throws.
 */
const createOrder = async ({ amount, receipt, notes = {} }) => {
  const rz = getInstance();
  return await rz.orders.create({
    amount:   Math.round(amount),
    currency: 'INR',
    receipt:  receipt.substring(0, 40), // Razorpay max receipt length = 40
    notes,
  });
};

/**
 * Fetch a payment from Razorpay (to double-check captured status).
 * Used after webhook or as backup verification.
 */
const fetchPayment = async (paymentId) => {
  const rz = getInstance();
  return await rz.payments.fetch(paymentId);
};

/**
 * Generate a "dev mode" synthetic order when Razorpay is not configured.
 * This lets the app work in local development without real keys.
 */
const devOrder = (prefix, amount) => ({
  devMode: true,
  orderId: `dev_${prefix}_${Date.now()}`,
  amount,
  currency: 'INR',
  keyId: 'dev_key',
});

module.exports = { isConfigured, isLiveMode, getInstance, verifySignature, verifyWebhookSignature, createOrder, fetchPayment, devOrder };
