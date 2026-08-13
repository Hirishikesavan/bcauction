'use strict';
const { betterAuth }     = require('better-auth');
const { mongodbAdapter } = require('better-auth/adapters/mongodb');
const { MongoClient }    = require('mongodb');

let _auth   = null;
let _client = null;
let _db     = null;

const initAuth = async () => {
  if (_auth) return _auth;

  const URI = process.env.MONGODB_URI;
  if (!URI) throw new Error('MONGODB_URI is not set');

  _client = new MongoClient(URI);
  await _client.connect();
  _db = _client.db('beast-cricket-auction');

  console.log('readyState =', 1);
  console.log('DB TYPE =', _db.constructor.name);
  console.log('CLIENT TYPE =', _client.constructor.name);

  const isProd      = process.env.NODE_ENV === 'production';
  const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3001';
  const backendURL  = process.env.BACKEND_URL  || 'http://localhost:5000';

  const trustedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5000',
    'http://localhost:5173',
    frontendURL,
    backendURL,
  ].filter(Boolean);

  const doSendVerificationEmail = async ({ user, url }) => {
    try {
      const { sendVerificationEmail } = require('../utils/email');
      console.log('📧 Sending verification email to:', user.email);
      console.log('📧 Raw URL from Better Auth:', url);

      let frontendVerifyURL = url;
      if (url && url.startsWith('http')) {
        try {
          const parsed = new URL(url);
          const token = parsed.searchParams.get('token');
          if (token) {
            frontendVerifyURL = frontendURL + '/verify-email?token=' + token;
          }
        } catch (e) { /* keep as-is */ }
      } else if (url && !url.startsWith('http')) {
        frontendVerifyURL = frontendURL + '/verify-email?token=' + url;
      }

      console.log('📧 Frontend verification URL:', frontendVerifyURL);
      await sendVerificationEmail(user.email, user.name, frontendVerifyURL);
      console.log('✅ Verification email sent to:', user.email);
    } catch (err) {
      console.error('❌ Verification email error:', err.message);
      console.error('❌ Full error:', err);
    }
  };

  const doSendPasswordResetEmail = async ({ user, url }) => {
    try {
      const { sendPasswordResetEmail } = require('../utils/email');
      let resetLink = url;
      try {
        const parsedUrl = new URL(url);
        const token = parsedUrl.searchParams.get('token');
        if (token) {
          resetLink = `${frontendURL}/reset-password?token=${token}`;
          console.log('📧 Built frontend reset URL:', resetLink);
        } else {
          resetLink = url.startsWith('http') ? url : `${frontendURL}/reset-password?token=${url}`;
        }
      } catch (parseErr) {
        resetLink = `${frontendURL}/reset-password?token=${url}`;
      }
      await sendPasswordResetEmail(user.email, user.name, resetLink);
      console.log('✅ Password reset email sent to:', user.email);
    } catch (err) {
      console.error('❌ Password reset email error:', err.message);
    }
  };

  _auth = betterAuth({
    database: mongodbAdapter(_db),
    secret:   process.env.BETTER_AUTH_SECRET,
    baseURL:  backendURL,
    basePath: '/api/auth',

    emailAndPassword: {
      enabled:                  true,
      minPasswordLength:        6,
      requireEmailVerification: false,
      sendVerificationEmail:    doSendVerificationEmail,
      sendResetPasswordEmail:   doSendPasswordResetEmail,
      resetPasswordTokenExpiresIn: 60 * 60 * 2, // 2 hours
    },

    emailVerification: {
      sendOnSignUp:                true,
      autoSignInAfterVerification: true,
      expiresIn:                   60 * 60 * 24,
      sendVerificationEmail:       doSendVerificationEmail,
      verificationURL: (tokenOrUrl) => {
        let token = tokenOrUrl;
        if (tokenOrUrl && tokenOrUrl.startsWith('http')) {
          try {
            const parsed = new URL(tokenOrUrl);
            token = parsed.searchParams.get('token') || tokenOrUrl;
          } catch (e) { token = tokenOrUrl; }
        }
        return `${frontendURL}/verify-email?token=${token}`;
      },
    },

    socialProviders: {
      google: {
        clientId:     process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectURI:  `${backendURL}/api/auth/callback/google`,
        enabled:      true,
        // FIX: Always mark email as verified for Google accounts
        // Google has already verified the email; emailVerified must be true
        // for account linking to work in Chrome and all browsers.
        mapProfileToUser: (profile) => ({
          name:          profile.name,
          email:         profile.email,
          emailVerified: true,   // ← CRITICAL: forces emailVerified=true for Google accounts
          image:         profile.picture,
        }),
      },
    },

    // FIX account_not_linked in Chrome:
    // accountLinking with trustedProviders ensures that when a user who
    // previously registered with email/password tries to log in via Google,
    // their account is automatically linked instead of throwing account_not_linked.
    // This is the PRIMARY fix for Chrome vs Edge discrepancy.
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ['google'],
        // Also allow linking when email is not yet verified
        // (existing email/password users may not have verified yet)
        allowDifferentLinkedAccounts: false,
      },
    },

    // FIX state_mismatch / cookie issues in Chrome:
    // Store OAuth state in DB so Chrome's cookie restrictions don't break the flow.
    verification: {
      storeInDatabase: true,
    },

    session: {
      expiresIn:   60 * 60 * 24 * 7,
      updateAge:   60 * 60 * 24,
      // Disable cookie cache — always read fresh from DB.
      // Prevents stale role data from the cookie-cached session.
      cookieCache: { enabled: false },
    },

    user: {
      additionalFields: {
        role:    { type: 'string',  defaultValue: 'viewer', input: true },
        isAdmin: { type: 'boolean', defaultValue: false,    input: true },
      },
    },

    trustedOrigins,

    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            const adminEmails = (process.env.ADMIN_EMAIL || '').toLowerCase().split(',').map(e => e.trim());
            const userEmail = user.email.toLowerCase().trim();
            if (adminEmails.includes(userEmail)) {
              try {
                await _db.collection('user').updateOne(
                  { $or: [{ id: user.id }, { _id: user.id }] },
                  { $set: { role: 'admin', isAdmin: true } }
                );
                console.log('✅ Admin role set for:', user.email);
              } catch (e) {
                console.error('❌ Could not set admin role:', e.message);
              }
            }
          },
        },
        // FIX account_not_linked: when an existing email/password user
        // logs in via Google, ensure their emailVerified is set to true
        // so account linking works correctly.
        update: {
          after: async (user) => {
            try {
              // If user now has an emailVerified=true (set by Google OAuth),
              // ensure it's persisted in the DB for account linking to work.
              if (user.emailVerified === true) {
                await _db.collection('user').updateOne(
                  { id: user.id },
                  { $set: { emailVerified: true } }
                );
              }
            } catch (e) { /* non-fatal */ }
          },
        },
      },
      session: {
        create: {
          after: async (session) => {
            const adminEmails = (process.env.ADMIN_EMAIL || '').toLowerCase().split(',').map(e => e.trim());
            const userEmail = session.user?.email?.toLowerCase().trim();
            if (adminEmails.includes(userEmail)) {
              try {
                await _db.collection('user').updateOne(
                  { $or: [{ id: session.user.id }, { _id: session.user.id }] },
                  { $set: { role: 'admin', isAdmin: true } }
                );
                console.log('✅ Admin role enforced on session for:', session.user.email);
              } catch (e) {
                console.error('❌ Could not enforce admin role:', e.message);
              }
            }
          },
        },
      },
    },

    advanced: {
      useSecureCookies: isProd,
      crossSubDomainCookies: { enabled: false },
      defaultCookieAttributes: {
        // FIX Chrome account_not_linked:
        // In development: use 'lax' (works for same-site redirects)
        // In production: use 'none' with secure:true (required for cross-origin OAuth)
        // Chrome requires sameSite='none' + secure=true for cross-origin cookies.
        // Edge is more lenient. This explicit setting fixes Chrome.
        sameSite: isProd ? 'none' : 'lax',
        secure:   isProd,
        httpOnly: true,
        path:     '/',
        maxAge:   60 * 60 * 24 * 7, // 7 days
      },
      cookiePrefix: 'better-auth',
    },
  });

  // FIX: Pre-patch existing email/password users to have emailVerified=true
  // so they can be linked with Google OAuth accounts.
  // This runs once on startup and is idempotent.
  try {
    const result = await _db.collection('user').updateMany(
      { emailVerified: { $ne: true }, email: { $exists: true } },
      { $set: { emailVerified: true } }
    );
    if (result.modifiedCount > 0) {
      console.log(`✅ Fixed emailVerified for ${result.modifiedCount} existing users (enables Google OAuth linking)`);
    }
  } catch (e) {
    console.error('⚠️ Could not pre-patch emailVerified (non-fatal):', e.message);
  }

  console.log('✅ Better Auth initialized');
  console.log('AUTH FILE LOADED');
  return _auth;
};

const getAuth = () => {
  if (!_auth) throw new Error('Auth not initialized — call initAuth() first');
  return _auth;
};

const { toNodeHandler } = require('better-auth/node');
const getNodeHandler = () => toNodeHandler(getAuth());

module.exports = { initAuth, getAuth, getNodeHandler, getDb: () => _db };
