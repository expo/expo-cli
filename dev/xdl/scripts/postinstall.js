'use strict';

const path = require('path');
const rimraf = require('rimraf');

function postinstall(done) {
  let dtraceProviderPath;
  try {
    dtraceProviderPath = require.resolve('dtrace-provider');
  } catch (error) {
    // dtrace-provider is not installed or has been removed; do nothing
    done();
    return;
  }

  // Find the package directory path
  while (
    dtraceProviderPath !== path.dirname(dtraceProviderPath) &&
    !path.dirname(dtraceProviderPath).endsWith(`${path.sep}node_modules`)
  ) {
    dtraceProviderPath = path.dirname(dtraceProviderPath);
  }

  console.log('Deleting dtrace-provider from XDL...');
  rimraf(dtraceProviderPath, done);
}

if (module === require.main) {
  postinstall(error => {
    if (error) {
      console.error(`Something went wrong with XDL's postinstall script:`);
      console.error(error);
    }
  });
}
