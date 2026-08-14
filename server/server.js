require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const ioStore = require('./socket/io');
const { authMiddleware } = require('./lib/middleware');
const { getCloudinaryStatus } = require('./utils/cloudinary');

// ── Uploads dir ─────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const server = http.createServer(app);
const isProd = process.env.NODE_ENV === 'production';

// ── CORS Configuration ──────────────────────
const allowedOrigins = [...new Set([
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:3001',
  process.env.FRONTEND_URL,
  'https://beast-cricket-frontend-production.up.railway.app',
].filter(Boolean))];

if (isProd) {
  allowedOrigins.push(/\.railway\.app$/);
}

console.log('🌐 Allowed CORS origins:', allowedOrigins);
console.log('🌐 FRONTEND_URL env var:', process.env.FRONTEND_URL);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    const allowed = allowedOrigins.some(allowed => 
      typeof allowed === 'string' ? allowed === origin : allowed.test(origin)
    );
    
    if (allowed) {
      callback(null, true);
    } else if (isProd && origin.includes('.railway.app')) {
      callback(null, true);
    } else {
      console.log('⚠️ CORS blocked origin:', origin);
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie', 'Authorization'],
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ── Socket.io Configuration ──────────────────
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
});

ioStore.setIO(io);
app.set('io', io);

// ── Security ────────────────────────────────
app.set('trust proxy', 1);

if (isProd) {
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
}

app.disable('x-powered-by');

// ── Razorpay Webhook — MUST be before express.json() to preserve raw body ──
// The /webhook route uses express.raw() internally; registering it before
// the global JSON parser ensures rawBody bytes reach it unmodified.
app.post('/api/payment/webhook', require('./routes/payment'));

// ── Body Parsing ────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ── NoSQL Injection Prevention ───────────────────────────────
try {
  const mongoSanitize = require('express-mongo-sanitize');
  app.use(mongoSanitize({ replaceWith: '_' }));
} catch (e) {
  // package may not be installed yet — safe to skip
}

// ── Stricter rate limits per endpoint ───────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: isProd ? 20 : 200,
  message: 'Too many auth requests — please wait', standardHeaders: true, legacyHeaders: false,
});
const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, max: isProd ? 10 : 100,
  message: 'Too many payment requests', standardHeaders: true, legacyHeaders: false,
});

// ── Rate Limiting ───────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 500 : 2000,
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);
app.use('/api/auth', authLimiter);
app.use('/api/payment', paymentLimiter);

// ── Static Files ────────────────────────────
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '1d',
  setHeaders: (res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
  }
}));

// Log uploads directory for debugging
console.log('📂 Serving static files from:', uploadsDir);
console.log('📂 Uploads URL path: /uploads');

// ── Auth Middleware ─────────────────────────
app.use(authMiddleware);

// ── Admin role enforcement middleware ───────────────────────────────
// Disabled for no-auth mode - pass through without checks
const _adminRoleEnforce = async (req, res, next) => {
  // No-auth mode - pass through without admin role enforcement
  return next();
};

// ── API Routes ──────────────────────────────
// Apply admin role enforcement middleware to ALL API routes
app.use('/api', _adminRoleEnforce);

// Better Auth handler removed - no-auth mode for production
// const { auth } = require('./lib/auth-better');
// app.use(auth.handler);

// Mount legacy auth routes at /api/user for update-role endpoint
app.use('/api/user', require('./routes/auth'));
app.use('/api/auctions', require('./routes/auctions'));
app.use('/api/teams',    require('./routes/teams'));
app.use('/api/admin',    require('./routes/admin'));
app.use('/api/payment',  require('./routes/payment'));
app.use('/api/packages', require('./routes/packages'));

// Preload models so indexes are built on startup
require('./models/OrganizerPackage');
require('./models/OrganizerProfile');
require('./models/Invoice');
require('./models/Wallet');
require('./models/PayoutRequest');
require('./models/AuctionReplay');
require('./models/Sponsor');
require('./models/CustomBranding');

// ── Set Role (after login/OAuth — user picks their role) ─
app.post('/api/user/set-role', authMiddleware, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { role } = req.body;

    // Admin keeps their role — never downgrade admin to regular role
    const ADMIN_EMAILS = (process.env.ADMIN_EMAIL || 'hirishi2020@gmail.com').toLowerCase().split(',').map(e => e.trim());
    if (req.user.email && ADMIN_EMAILS.includes(req.user.email.toLowerCase())) {
      return res.json({ success: true, role: 'admin' });
    }
    const allowed = ['organizer', 'team_owner', 'viewer'];
    if (!allowed.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Use the shared getDb() connection — same instance as authenticate middleware.
    // This avoids the new-MongoClient race condition and ensures the DB write is
    // immediately visible to subsequent authenticate() calls on the same connection.
    const db = getDb();

    // Query by 'id' field ONLY (Better Auth string ID).
    // The $or with _id previously caused silent misses when _id was an ObjectId
    // and the string value didn't match — resulting in modifiedCount=0 and a
    // stale 'team_owner' role persisting in the DB despite a successful response.
    const updateResult = await db.collection('user').updateOne(
      { id: req.user.id },
      { $set: { role } }
    );

    if (updateResult.modifiedCount === 0 && updateResult.matchedCount === 0) {
      // User not found by string 'id' — this should never happen for Better Auth users
      // but handle gracefully to surface the error instead of silently failing.
      console.error(`❌ [set-role] User not found in DB for id: ${req.user.id} (${req.user.email})`);
      return res.status(500).json({ error: 'Failed to update role: user record not found in database.' });
    }

    // Also update via Better Auth API so the session object reflects the new role.
    // Authentication removed - no Better Auth sync needed

    console.log('✅ [set-role] Role set in DB:', req.user.email, '→', role);
    return res.json({ success: true, role });
  } catch (err) {
    console.error('set-role error:', err.message);
    return res.status(500).json({ error: 'Failed to set role' });
  }
});

// ── Fix Admin Role (manual fix for existing admin accounts) ─
app.post('/api/user/fix-admin-role', authMiddleware, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'hirishi2020@gmail.com').toLowerCase();
    
    // Only allow the admin emails to fix their own role
    const ADMIN_EMAILS = (process.env.ADMIN_EMAIL || 'hirishi2020@gmail.com').toLowerCase().split(',').map(e => e.trim());
    if (req.user.email && ADMIN_EMAILS.includes(req.user.email.toLowerCase())) {
      const { MongoClient } = require('mongodb');
      const c = new MongoClient(process.env.MONGODB_URI);
      await c.connect();
      const db = c.db('beast-cricket-auction');
      
      // Update user role to admin
      await db.collection('user').updateOne(
        { $or: [{ id: req.user.id }, { _id: req.user.id }] },
        { $set: { role: 'admin', isAdmin: true } }
      );
      
      await c.close();
      
      console.log('✅ Admin role fixed for:', req.user.email);
      return res.json({ success: true, role: 'admin', message: 'Admin role fixed. Please login again.' });
    }
    
    return res.status(403).json({ error: 'Only admin email can use this endpoint' });
  } catch (err) {
    console.error('fix-admin-role error:', err.message);
    return res.status(500).json({ error: 'Failed to fix admin role' });
  }
});

// ── Update Profile (name / email) ───────────────────────────
// NOTE: the old client calls went to /api/auth/profile which Better
// Auth's own handler intercepts (it has no such route) — every save
// silently 404'd and showed "Failed to update profile". This is the
// real, working route, following the same direct-Mongo pattern as
// set-role above (Better Auth's updateUser endpoint refuses email
// changes outright, so we update the 'user' collection directly).
app.put('/api/user/profile', authMiddleware, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required.' });
    const nameClean  = String(name).trim();
    const emailClean = String(email).toLowerCase().trim();

    // Use the shared DB connection (not a new MongoClient per request)
    const { getDb } = require('./lib/auth');
    const db = getDb();

    // Check email uniqueness - exclude the current user by their id (string field used by Better Auth)
    // Also check the user's current email — if they're keeping the same email, skip the check
    const currentUser = await db.collection('user').findOne({ id: req.user.id });
    const currentEmail = (currentUser?.email || '').toLowerCase().trim();

    if (emailClean !== currentEmail) {
      const existing = await db.collection('user').findOne({
        email: { $regex: new RegExp('^' + emailClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') },
        id: { $ne: req.user.id },
      });
      if (existing) return res.status(400).json({ error: 'That email is already registered to another account.' });
    }

    // Update the Better Auth user collection (this is what getSession reads)
    await db.collection('user').updateOne(
      { id: req.user.id },
      { $set: { name: nameClean, email: emailClean, updatedAt: new Date() } }
    );

    // Authentication removed - no Better Auth sync needed

    const updated = await db.collection('user').findOne({ id: req.user.id });
    console.log('✅ Profile updated for:', emailClean);
    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id:    req.user.id,
        name:  updated?.name  || nameClean,
        email: updated?.email || emailClean,
        role:  updated?.role  || req.user.role,
      },
    });
  } catch (err) {
    console.error('update-profile error:', err.message);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// ── Change Password ──────────────────────────────────────────
app.put('/api/user/change-password', authMiddleware, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password are required.' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });

    // Authentication removed - password change disabled

    console.log('✅ Password changed for:', req.user.email);
    return res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    console.error('change-password error:', err.message);
    const msg = /invalid|incorrect|wrong/i.test(err.message || '') ? 'Current password is incorrect.' : (err.message || 'Failed to change password.');
    return res.status(400).json({ error: msg });
  }
});

// ── Delete Account ────────────────────────────────────────────
app.delete('/api/user/account', authMiddleware, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { MongoClient } = require('mongodb');
    const c = new MongoClient(process.env.MONGODB_URI);
    await c.connect();
    const db = c.db('beast-cricket-auction');
    await db.collection('session').deleteMany({ userId: req.user.id });
    await db.collection('account').deleteMany({ userId: req.user.id });
    await db.collection('user').deleteOne({ $or: [{ id: req.user.id }, { _id: req.user.id }] });
    await c.close();
    console.log('✅ Account deleted:', req.user.email);
    return res.json({ success: true, message: 'Account deleted.' });
  } catch (err) {
    console.error('delete-account error:', err.message);
    return res.status(500).json({ error: 'Failed to delete account.' });
  }
});


app.post('/api/emergency-fix-admin', async (req, res) => {
  try {
    const { email } = req.body;
    const ADMIN_EMAILS = (process.env.ADMIN_EMAIL || 'hirishi2020@gmail.com').toLowerCase().split(',').map(e => e.trim());
    
    if (!email || !ADMIN_EMAILS.includes(email.toLowerCase())) {
      return res.status(403).json({ error: 'Only admin email can use this endpoint' });
    }
    
    const { MongoClient } = require('mongodb');
    const c = new MongoClient(process.env.MONGODB_URI);
    await c.connect();
    const db = c.db('beast-cricket-auction');
    
    // Find user by email
    const user = await db.collection('user').findOne({ email: email.toLowerCase() });
    if (!user) {
      await c.close();
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Force update user role to admin
    await db.collection('user').updateOne(
      { _id: user._id },
      { $set: { role: 'admin', isAdmin: true } }
    );
    
    // Delete all sessions for this user
    await db.collection('session').deleteMany({ userId: user.id });
    
    await c.close();
    
    console.log('✅ EMERGENCY: Admin role force-fixed for:', email);
    return res.json({ success: true, role: 'admin', message: 'Emergency fix applied. Please login again.' });
  } catch (err) {
    console.error('emergency-fix-admin error:', err.message);
    return res.status(500).json({ error: 'Failed to apply emergency fix' });
  }
});

// ── Get current session user ───────────────────────────
app.get('/api/user/me', authMiddleware, (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  return res.json({ success: true, user: req.user });
});

// ── Test Email (admin only, dev mode) ─────────
app.post('/api/test-email', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not available in production' });
  }
  try {
    const { sendVerificationEmail } = require('./utils/email');
    const testEmail = req.body?.email || process.env.ADMIN_EMAIL || 'hirishi2020@gmail.com';
    await sendVerificationEmail(testEmail, 'Test User', `${process.env.FRONTEND_URL || 'http://localhost:3001'}/verify-email?token=test123`);
    res.json({ ok: true, message: `Test email sent to ${testEmail}` });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Health Checks ───────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    auth: 'Better Auth v1.2.7',
    adminEmail: process.env.ADMIN_EMAIL || 'not-set',
  });
});

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/', (req, res) => {
  res.json({
    message: 'BCA Auction Backend API',
    status: 'running',
    auth: 'Better Auth (Google OAuth + Email/Password)',
    version: '2.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/*',
      auctions: '/api/auctions/*',
      admin: '/api/admin/*',
    }
  });
});
app.get('/debug-google', (req, res) => {
  res.json({
    hasGoogleId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    backendUrl: process.env.BACKEND_URL,
    frontendUrl: process.env.FRONTEND_URL,
    authLoaded: false,
  });
});

// ── Force Verify Email (fixes account_not_linked for Google OAuth in Chrome) ──
// When an existing email/password user tries to sign in with Google, Better Auth
// requires emailVerified=true to auto-link accounts. This endpoint lets users
// (or the startup script) patch their own emailVerified status.
app.post('/api/user/force-verify-email', authMiddleware, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { getDb } = require('./lib/auth');
    const db = getDb();
    await db.collection('user').updateOne(
      { id: req.user.id },
      { $set: { emailVerified: true } }
    );
    console.log('✅ emailVerified forced for:', req.user.email);
    return res.json({ success: true, message: 'Email marked as verified.' });
  } catch (err) {
    console.error('force-verify-email error:', err.message);
    return res.status(500).json({ error: 'Failed to verify email.' });
  }
});

// ── 404 Handler ─────────────────────────────
app.get('/debug-auth', async (req, res) => {
  try {
    res.json({
      ok: true,
      authLoaded: false,
    });
  } catch (e) {
    res.status(500).json({
      error: e.message,
      stack: e.stack,
    });
  }
});
app.use((req, res) => {
  console.log('❌ 404:', req.method, req.url);
  res.status(404).json({
    error: `${req.method} ${req.url} not found`,
    availableRoutes: ['/api/auth', '/api/auctions', '/api/admin', '/api/health']
  });
});

// ── Error Handler ───────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.message);
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: isProd ? 'Server error' : err.message,
    ...(isProd ? {} : { stack: err.stack })
  });
});

// ── MongoDB Connection & Start ──────────────
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(async () => {
  console.log('✅ MongoDB connected');
  console.log('👨‍💼 Admin Email:', process.env.ADMIN_EMAIL || 'not-set');
  // Test SMTP connection on startup
  try {
    const { verifyTransporter } = require('./utils/email');
    const smtpOk = await verifyTransporter();
    if (smtpOk) {
      console.log('📬 SMTP (Gmail): ✅ Connected — emails will work');
    } else {
      console.log('📬 SMTP (Gmail): ❌ Cannot connect — check EMAIL_USER and EMAIL_PASS in .env');
      console.log('   EMAIL_USER:', process.env.EMAIL_USER || 'not-set');
      console.log('   Tip: Use Gmail App Password (not your Gmail login password)');
    }
  } catch (smtpErr) {
    console.log('📬 SMTP: ❌ Error —', smtpErr.message);
  }
  console.log('🔐 Google OAuth:', process.env.GOOGLE_CLIENT_ID ? '✅' : '❌');
  // FIX: this used to just check "is CLOUDINARY_URL set" — which reported
  // ✅ even when it held an unmodified placeholder copied from
  // .env.example. Now reports the REAL validated status, with the reason
  // when it's not actually usable, so this is never misleading at startup.
  const cloudStatus = getCloudinaryStatus();
  if (cloudStatus.configured) {
    console.log(`📸 Cloudinary: ✅ (${cloudStatus.cloudName}, via ${cloudStatus.source})`);
  } else {
    console.log(`📸 Cloudinary: ❌ ${cloudStatus.reason || 'not configured'} — using local disk storage (server/uploads)`);
  }

  require('./socket/auctionEngine')(io);

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, process.env.HOSTNAME || '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔐 Authentication: Disabled`);
  });
})
.catch(err => {
  console.error('❌ MongoDB connection failed:', err.message);
  process.exit(1);
});

// ── Graceful Shutdown ───────────────────────
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});