#!/usr/bin/env node
import path from 'path';

import { ConfigError, errorToJSON } from '../Errors';
import { serializeAndEvaluate } from '../Serialize';
import { ConfigContext } from '../Config.types';

'use strict';

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
  } catch (_) {}
}

try {
  const configFile = path.resolve(configFileArg);

  require('@babel/register')({
    only: [configFile],
    extensions: ['.ts', '.js'],
    presets: [require.resolve('@expo/babel-preset-cli')],
  });

  let result = require(configFile);
  if (result.default != null) {
    result = result.default;
  }
  const exportedObjectType = typeof result;
  if (typeof result === 'function') {
    result = result(request);
  }

  if (result instanceof Promise) {
    throw new ConfigError(`Config file ${configFile} cannot return a Promise.`, 'INVALID_CONFIG');
  }

  console.log(JSON.stringify({ config: serializeAndEvaluate(result), exportedObjectType }));
  process.exit(0);
} catch (error) {
  console.error(JSON.stringify(errorToJSON(error)));
  process.exit(-1);
}
