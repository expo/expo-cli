const { schedule } = require('danger');
const { istanbulCoverage } = require('danger-plugin-istanbul-coverage');

schedule(
  istanbulCoverage({
    coveragePaths: ['./packages/android-manifest/coverage/coverage-final.json'],
    // What to do when the PR doesn't meet the minimum code coverage threshold
    reportMode: 'message', // || "warn" || "fail"
  })
);
