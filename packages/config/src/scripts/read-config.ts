#!/usr/bin/env node
'use strict';

import path from 'path';

import { ConfigContext } from '../Config.types';
import { errorToJSON } from '../Errors';
import { evalConfig } from '../evalConfig';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err;
});

const { 3: configFileArg, 4: requestArg } = process.argv;

let request: ConfigContext | null = null;

if (typeof requestArg === 'string') {
  try {
    request = JSON.parse(requestArg) as ConfigContext;
  } catch {
    // do nothing if the request fails to parse.
    // TODO: document a case for why we should do nothing, perhaps it would make sense to have an error classification for this in the future.
  }
}

try {
  // TODO: do we need to resolve here?
  const configFile = path.resolve(configFileArg);
  const result = evalConfig(configFile, request);
  console.log(JSON.stringify(result));
  process.exit(0);
} catch (error) {
  console.error(JSON.stringify(errorToJSON(error)));
  process.exit(-1);
}
