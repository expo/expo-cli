import type { Command } from 'commander';

import { login } from '../accounts';

export default function (program: Command) {
  program
    .command('login')
    .description('Login to an Expo account')
    .alias('signin')
    .helpGroup('auth')
    .option('-u, --username [string]', 'Username')
    .option('-p, --password [string]', 'Password')
    .option('--otp [string]', 'One-time password from your 2FA device')
    .asyncAction(login);
}
