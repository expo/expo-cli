#!/usr/bin/env node
var semver = require('semver');
var version = process.versions.node;

if (semver.satisfies(version, '^10.13.0 || ^12.0.0 || ^13.0.0')) {
  require('../build/cli.js')
    .runAsync(process.argv)
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
} else {
  throw new Error('expo-codemod supports Node versions ^10.13.0, ^12.0.0 and ^13.0.0.');
}
