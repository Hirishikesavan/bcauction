'use strict';
// NO-AUTH MODE - Better Auth completely disabled

const mongoose = require('mongoose');
let _db = null;

const initAuth = async () => {
  // No-auth mode - do not initialize Better Auth
  return null;
};

const getAuth = () => {
  // No-auth mode - return null to prevent Better Auth calls
  return null;
};

const getDb = () => {
  // Return mongoose connection for direct DB access
  if (!_db && mongoose.connection.readyState === 1) {
    _db = mongoose.connection.db;
  }
  return _db;
};

module.exports = { initAuth, getAuth, getDb };
