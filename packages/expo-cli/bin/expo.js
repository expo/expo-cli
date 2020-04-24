#!/usr/bin/env node
const chalk = require('chalk');
const semver = require('semver');
const version = process.versions.node;

const supportedVersions = [
  { range: semver.validRange('^10.13.0'), name: 'Active LTS' },
  { range: semver.validRange('^12.0.0'), name: 'Active LTS' },
  { range: semver.validRange('^13.0.0'), name: 'Current Release' },
];

const isSupported = supportedVersions.some(function(supported) {
  return semver.satisfies(version, supported.range);
});

if (isSupported) {
  require('../build/exp.js').run('expo');
} else {
  const versionInfo = supportedVersions
    .map(function(supported) {
      return '* ' + supported.range + ' (' + supported.name + ')';
    })
    .join('\n');

  const maxSupportedVersion = supportedVersions[supportedVersions.length - 1];
  const versionIsHigherThanSupported = semver.gtr(version, maxSupportedVersion.range);

  console.error(
    chalk.red(
      'ERROR: Node.js version ' +
        version +
        ` is ${versionIsHigherThanSupported ? 'not yet' : 'no longer'} supported.\n\n` +
        'expo-cli supports following Node.js versions:\n' +
        versionInfo
    )
  );
  process.exit(1);
}
