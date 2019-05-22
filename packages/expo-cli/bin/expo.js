#!/usr/bin/env node
var getenv = require('getenv');
var semver = require('semver');
var version = process.versions.node;

if (semver.satisfies(version, '8.x.x || >=10.0.0')) {
  if (getenv.boolish('EXPO_DEBUG', false)) {
    require('source-map-support').install();
  }
  require('../build/exp.js').run('expo');
} else {
  throw new Error('expo-cli supports Node versions 8.x.x, 10.x.x and newer.');
}
