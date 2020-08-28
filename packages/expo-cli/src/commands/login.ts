import { Command } from 'commander';

import { login } from '../accounts';

export default function(program: Command) {
  program
    .command('login', 'Login to your Expo account')
    .alias('signin')
    .helpGroup('auth')
    .option('-u, --username [string]', 'Username')
    .option('-p, --password [string]', 'Password')
    .asyncAction(login);
}
