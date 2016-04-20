var signupOrLogin = require('../accounts').signupOrLogin;

module.exports = (program) => {
  program
    .command('signup')
    .description('Creates a user on exp.host')
    .option('-u, --username [string]', 'Username')
    .option('-p, --password [string]', 'Password')
    .asyncAction(signupOrLogin);
};
