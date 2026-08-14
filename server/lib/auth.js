'use strict';
// Authentication removed - stub functions for compatibility

let _db = null;

const initAuth = async () => {
  // No-op - authentication disabled
  return null;
};

const getAuth = () => {
  // Return null stub - authentication disabled
  return null;
};

const getDb = () => {
  // Return mongoose connection instead
  if (!_db && mongoose.connection.readyState === 1) {
    _db = mongoose.connection.db;
  }
  return _db;
};

module.exports = { initAuth, getAuth, getDb };
