const runTest = require('./runTest');
const tests = ['basic', 'assets'];

console.log('Running tests...');
runTest(tests.shift(), tests);
