#!/usr/bin/env node
var semver = require('semver');
var version = process.versions.node;

if (semver.satisfies(version, '8.x.x || >=10.0.0')) {
  require('../build/src/cli.js')
    .runAsync(process.argv)
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
} else {
  throw new Error('expo-codemod supports Node versions 8.x.x, 10.x.x and newer.');
}
