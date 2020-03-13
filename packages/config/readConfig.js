#!/usr/bin/env node

'use strict';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err;
});

function serializeAndEvaluate(val) {
  if (['undefined', 'string', 'boolean', 'number', 'bigint'].includes(typeof val)) {
    return val;
  } else if (typeof val === 'function') {
    // TODO: Bacon: Should we support async methods?
    return val();
  } else if (Array.isArray(val)) {
    return val.map(serializeAndEvaluate);
  } else if (typeof val === 'object') {
    const output = {};
    for (const property in val) {
      if (val.hasOwnProperty(property)) {
        output[property] = serializeAndEvaluate(val[property]);
      }
    }
    return output;
  }
  // symbol
  throw new Error(`Expo config doesn't support \`Symbols\`: ${val}`, 'INVALID_CONFIG');
}

const path = require('path');
let request = null;
if (typeof process.argv[4] === 'string') {
  try {
    request = JSON.parse(process.argv[4]);
  } catch (_) {}
}
try {
  const configFile = path.resolve(process.argv[3]);

  require('@babel/register')({
    only: [configFile],
  });

  let result = require(configFile);
  if (result.default != null) {
    result = result.default;
  }
  if (typeof result === 'function') {
    result = result(request);
  }

  if (result instanceof Promise) {
    const error = new Error(`Config file ${configFile} cannot return a Promise.`);
    error.code = 'INVALID_CONFIG';
    throw error;
  }

  console.log(JSON.stringify(serializeAndEvaluate(result)));
  process.exit(0);
} catch (error) {
  console.error(
    JSON.stringify({
      ...error,
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack,
    })
  );
  process.exit(-1);
}
