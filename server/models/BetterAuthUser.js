const mongoose = require('mongoose');

// ════════════════════════════════════════════════════════════════════════════
// BETTER AUTH USER (read-mostly mirror model)
// ════════════════════════════════════════════════════════════════════════════
// IMPORTANT: Better Auth manages its OWN user collection via the native
// MongoDB driver (mongodbAdapter), completely separate from the legacy
// Mongoose `User` model (models/User.js -> collection "users", plural).
//
// Better Auth's collection is named "user" (singular) and its documents use
// a real Mongo ObjectId for _id (better-auth's mongo adapter generates a
// native ObjectId and exposes `user.id` as that ObjectId's .toString()).
//
// Team.ownerId is set from `req.user.id` / `socketUser.id` (the Better Auth
// session user), so any `ref` used to populate it MUST point at the Better
// Auth "user" collection — not the legacy "users" collection. Pointing
// `ref: 'User'` (legacy model) at it causes populate() to silently resolve
// to null for every real account, which is why team owners could never be
// matched to "their" team (no bid button, "No team in this auction").
//
// This model is intentionally schema-less (`strict: false`) since Better
// Auth owns the actual shape of these documents — we only ever read from it.
// ════════════════════════════════════════════════════════════════════════════
const betterAuthUserSchema = new mongoose.Schema({}, { strict: false, collection: 'user' });

module.exports = mongoose.models.BetterAuthUser
  || mongoose.model('BetterAuthUser', betterAuthUserSchema, 'user');
