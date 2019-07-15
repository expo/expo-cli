#!/usr/bin/env node
var chalk = require('chalk');
var getenv = require('getenv');
var semver = require('semver');
var version = process.versions.node;

var supportedVersions = [
  { range: '>=8.9.0 <9.0.0', name: 'Maintenance LTS' },
  { range: '>=10.13.0 <11.0.0', name: 'Active LTS' },
  { range: '>=12.0.0', name: 'Current Release' },
];
var isSupported = supportedVersions.some(function(supported) {
  return semver.satisfies(version, supported.range);
});

if (isSupported) {
  if (getenv.boolish('EXPO_DEBUG', false)) {
    require('source-map-support').install();
  }
  require('../build/exp.js').run('expo');
} else {
  var versionInfo = supportedVersions
    .map(function(supported) {
      return '* ' + supported.range + ' (' + supported.name + ')';
    })
    .join('\n');
  console.error(
    chalk.red(
      'ERROR: Node.js version ' +
        version +
        ' is no longer supported.\n\n' +
        'expo-cli supports following Node.js versions:\n' +
        versionInfo
    )
  );
  process.exit(1);
}
