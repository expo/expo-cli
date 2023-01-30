#!/usr/bin/env node

function yellow(text) {
  return '\u001b[33m' + text + '\u001b[39m';
}

const match = /v(\d+)\.(\d+)/.exec(process.version);
const major = parseInt(match[1], 10);

// If newer than the current release
if (major > 16) {
  // eslint-disable-next-line no-console
  console.warn(
    yellow(
      'WARNING: The legacy expo-cli does not support Node +17. Migrate to the versioned Expo CLI (npx expo).'
    )
  );
}

require('../build/exp.js').run('expo');
