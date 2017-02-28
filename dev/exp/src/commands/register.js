/**
 * @flow
 */

import { register } from '../accounts';

export default (program: any) => {
  program
    .command('register')
    .description('Sign up for a new Expo account')
    .option('--github', 'Sign up with a GitHub account')
    .asyncAction(register);
};
