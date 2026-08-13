'use strict';
// Singleton IO store so routes can emit events without circular deps
let _io = null;
module.exports = {
  setIO: (io) => { _io = io; },
  getIO: () => _io,
};
