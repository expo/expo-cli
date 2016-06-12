var signupOrLogin = require('../accounts').signupOrLogin;

export default (program) => {
  program
    .command('login')
    .description('Login to exp.host')
    .option('-u, --username [string]', 'Username')
    .option('-p, --password [string]', 'Password')
    .asyncAction(signupOrLogin);
};
