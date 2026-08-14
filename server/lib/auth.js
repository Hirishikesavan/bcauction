'use strict';
// Authentication removed - stub functions for compatibility

let _db = null;

const initAuth = async () => {
  // No-op - authentication disabled
  return null;
};

const getAuth = () => {
  // Return stub object with getSession method for compatibility
  // This prevents "Cannot read property 'getSession' of null" errors
  return {
    api: {
      getSession: async () => null // No session - authentication disabled
    }
  };
};

const getDb = () => {
  // Return mongoose connection instead
  if (!_db && mongoose.connection.readyState === 1) {
    _db = mongoose.connection.db;
  }
  return _db;
};

module.exports = { initAuth, getAuth, getDb };
