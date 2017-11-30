'use strict';

module.exports = {
  process(src, filename) {
    return require('babel-jest').process(src, filename);
  },
};
