/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */
'use strict';

let realMkdirp = require('mkdirp');
let fs = require('./graceful-fs');

let mkdirp = function(p, opts, f, made) {
  return realMkdirp(p, { ...opts, fs }, f, made);
};

mkdirp.sync = function sync(p, opts, made) {
  return realMkdirp.sync(p, { ...opts, fs }, made);
};

module.exports = mkdirp;
