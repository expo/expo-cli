const gutil = require('gulp-util');
const path = require('path');
const rimraf = require('rimraf');

const tasks = {
  postinstall(done) {
    let dtraceProviderPath;
    try {
      dtraceProviderPath = require.resolve('dtrace-provider');
    } catch (error) {
      // dtrace-provider is not installed or has been removed; do nothing
      return done();
    }

    // Find the package directory path
    while (dtraceProviderPath !== path.dirname(dtraceProviderPath) &&
        !path.dirname(dtraceProviderPath).endsWith(`${path.sep}node_modules`)) {
      dtraceProviderPath = path.dirname(dtraceProviderPath);
    }

    gutil.log('Deleting dtrace-provider from XDL...');
    rimraf(dtraceProviderPath, done);
  },
};

module.exports = tasks;
