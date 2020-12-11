#!/usr/bin/env node

function red(text) {
  return '\u001b[31m' + text + '\u001b[39m';
}
function yellow(text) {
  return '\u001b[33m' + text + '\u001b[39m';
}

const match = /v(\d+)\.(\d+)/.exec(process.version);
const major = parseInt(match[1], 10);
const minor = parseInt(match[2], 10);

const supportedVersions =
  'expo-cli supports following Node.js versions:\n' +
  '* >=12.13.0 <13.0.0 (Maintenance LTS)\n' +
  '* >=14.0.0 <15.0.0 (Active LTS)\n' +
  '* >=15.0.0 <16.0.0 (Current Release)\n';

// If newer than the current release
if (major > 15) {
  // eslint-disable-next-line no-console
  console.warn(
    yellow(
      'WARNING: expo-cli has not yet been tested against Node.js ' +
        process.version +
        '.\n' +
        'If you encounter any issues, please report them to https://github.com/expo/expo-cli/issues\n' +
        '\n' +
        supportedVersions
    )
  );
} else if (!((major === 12 && minor >= 13) || major === 14 || major === 15)) {
  // eslint-disable-next-line no-console
  console.error(
    red('ERROR: Node.js ' + process.version + ' is no longer supported.\n\n' + supportedVersions)
  );
  process.exit(1);
}

require('../build/exp.js').run('expo');
