#!/usr/bin/env node
/**
 * Copyright (c) 2019-present, Expo
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err;
});

const spawnAsync = require('@expo/spawn-async');

const args = process.argv.slice(2);

const scriptIndex = args.findIndex(x => x === 'build' || x === 'start' || x === 'customize');
const script = scriptIndex === -1 ? args[0] : args[scriptIndex];
const nodeArgs = scriptIndex > 0 ? args.slice(0, scriptIndex) : [];

if (['build', 'start', 'customize'].includes(script)) {
  spawnAsync(
    'node',
    nodeArgs.concat(require.resolve('../scripts/' + script)).concat(args.slice(scriptIndex + 1)),
    { stdio: 'inherit' }
  ).then(result => {
    if (result.signal) {
      if (result.signal === 'SIGKILL') {
        console.log(
          'The build failed because the process exited too early. ' +
            'This probably means the system ran out of memory or someone called ' +
            '`kill -9` on the process.'
        );
      } else if (result.signal === 'SIGTERM') {
        console.log(
          'The build failed because the process exited too early. ' +
            'Someone might have called `kill` or `killall`, or the system could ' +
            'be shutting down.'
        );
      }
      process.exit(1);
    }
    process.exit(result.status);
  });
} else {
  console.log('Invalid command "' + script + '".');
}
