/**
 * @flow
 */

import { register } from '../accounts';

export default (program) => {
  program
    .command('register')
    .description('Register a new Exponent account')
    .option('--github', 'Register with a GitHub account')
    .asyncAction(register);
};
