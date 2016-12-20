/**
 * @flow
 */

import { register } from '../accounts';

export default (program: any) => {
  program
    .command('signup')
    .description('Sign up for a new Exponent account')
    .option('--github', 'Sign up with a GitHub account')
    .asyncAction(register);
};
