'use strict';
// Canonical Better Auth implementation - single source of truth for authentication

const mongoose = require('mongoose');
let _authInstance = null;
let _db = null;

const initAuth = async () => {
  // Import the real Better Auth instance from auth.ts
  if (!_authInstance) {
    const authModule = require('./auth.ts');
    _authInstance = authModule.auth;
  }
  return _authInstance;
};

const getAuth = () => {
  // Import and return the real Better Auth instance
  if (!_authInstance) {
    const authModule = require('./auth.ts');
    _authInstance = authModule.auth;
  }
  return _authInstance;
};

const getDb = () => {
  // Return mongoose connection for direct DB access
  if (!_db && mongoose.connection.readyState === 1) {
    _db = mongoose.connection.db;
  }
  return _db;
};

module.exports = { initAuth, getAuth, getDb };
