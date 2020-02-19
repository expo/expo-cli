const { schedule } = require('danger');
const { istanbulCoverage } = require('danger-plugin-istanbul-coverage');

schedule(istanbulCoverage());
