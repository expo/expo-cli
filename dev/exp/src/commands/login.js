/**
 * @flow
 */

import { login } from '../accounts';

export default (program) => {
  program
    .command('login')
    .description('Login to exp.host')
    .option('-u, --username [string]', 'Username')
    .option('-p, --password [string]', 'Password')
    .option('-t, --token [string]', 'Token')
    .option('--github', 'Login with Github')
    .asyncAction(login);
};
