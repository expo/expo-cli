import { Command } from 'commander';

import { register } from '../accounts';

export default function (program: Command) {
  program
    .command('register')
    .description('Sign up for a new Expo account')
    .asyncAction(() => register());
}
