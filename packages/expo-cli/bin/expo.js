#!/usr/bin/env node

var match = process.version.match(/v(\d+)\.(\d+)/);
var major = parseInt(match[1], 10);
var minor = parseInt(match[2], 10);

// If older than 10.13, or if 11.x
if (major < 10 || (major === 10 && minor < 13) || major === 11) {
  console.error(
    '\x1B[31mERROR: Node.js ' +
      process.version +
      ' is no longer supported.\x1B[39m\n' +
      '\x1B[31m\x1B[39m\n' +
      '\x1B[31mexpo-cli supports following Node.js versions:\x1B[39m\n' +
      '\x1B[31m* >=10.13.0 <11.0.0 (Active LTS)\x1B[39m\n' +
      '\x1B[31m* >=12.0.0 <13.0.0 (Active LTS)\x1B[39m\n' +
      '\x1B[31m* >=13.0.0 <14.0.0 (Current Release)\x1B[39m'
  );
  process.exit(1);
}

// If newer than the current release
if (major > 14) {
  console.error(
    '\x1B[33mWARNING: expo-cli has not yet been tested against Node.js ' +
      process.version +
      '. If you encounter any issues, please report them to https://github.com/expo/expo-cli/issues\x1B[39m\n' +
      '\x1B[33m\x1B[39m\n' +
      '\x1B[33mexpo-cli supports following Node.js versions:\x1B[39m\n' +
      '\x1B[33m* >=10.13.0 <11.0.0 (Active LTS)\x1B[39m\n' +
      '\x1B[33m* >=12.0.0 <13.0.0 (Active LTS)\x1B[39m\n' +
      '\x1B[33m* >=13.0.0 <14.0.0 (Current Release)\x1B[39m'
  );
}

require('../build/exp.js').run('expo');
