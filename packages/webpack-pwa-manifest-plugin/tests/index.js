const runTest = require('./runTest');
const tests = ['basic'];

console.log('Running tests...');
runTest(tests.shift(), tests);
