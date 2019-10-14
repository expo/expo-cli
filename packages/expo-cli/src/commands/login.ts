import { Command } from 'commander';

import { login } from '../accounts';

export default function(program: Command) {
  program
    .command('login')
    .alias('signin')
    .description('Log in with your Expo account.')
    .option('-u, --username [username]', 'Expo username.')
    .option('-p, --password [password]', 'Expo password.')
    .asyncAction(login);
}
