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
      'WARNING: The legacy expo-cli does not support Node +17. Migrate to the new local Expo CLI: https://blog.expo.dev/the-new-expo-cli-f4250d8e3421'
    )
  );
}

require('../build/exp.js').run('expo');
