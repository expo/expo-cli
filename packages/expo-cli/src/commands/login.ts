import { Command } from 'commander';

import { login } from '../accounts';

export default function (program: Command) {
  program
    .command('login')
    .alias('signin')
    .description('Login with your Expo account')
    .option('-u, --username [string]', 'Username')
    .option('-p, --password [string]', 'Password')
    .asyncAction(login);
}
