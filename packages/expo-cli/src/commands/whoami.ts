import { Command } from 'commander';
import chalk from 'chalk';
import { UserManager } from '@expo/xdl';

import log from '../log';
import CommandError from '../CommandError';

async function action() {
  const username = await UserManager.getCurrentUsernameAsync();
  if (username) {
    log(`Logged in as ${chalk.green(username)}`);
    log.raw(username);
  } else {
    throw new CommandError('NOT_LOGGED_IN', 'Not logged in');
  }
}

export default function(program: Command) {
  program
    .command('whoami')
    .alias('w')
    .description('Checks with the server and then says who you are logged in as')
    .asyncAction(action);
}
