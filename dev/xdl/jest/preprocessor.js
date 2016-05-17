'use strict';

module.exports = {
  process(src, filename) {
    require('instapromise');
    return require('babel-jest').process(src, filename);
  },
};
