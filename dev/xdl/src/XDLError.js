'use strict';

class XDLError extends Error {
  constructor(code, message) {
    super(message);

    this.code = code;
    this.isXDLError = true;
  }
}

module.exports = XDLError;
