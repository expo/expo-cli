import { Command } from 'commander';

import { login } from '../accounts';

export default function (program: Command) {
  program
    .command('login')
    .description('Login to an Expo account')
    .alias('signin')
    .helpGroup('auth')
    .option('-u, --username [string]', 'Username')
    .option(
      '-p, --password [string]',
      'Password. Deprecated in favor of the environment variable EXPO_CLI_PASSWORD'
    )
    .asyncAction(login);
}
