import { Command } from 'commander';
import chalk from 'chalk';
import { UserManager } from '@expo/xdl';

import log from '../log';
import CommandError from '../CommandError';

async function action() {
  const user = await UserManager.getCurrentUserAsync({ silent: true });
  if (user) {
    log(`Logged in as ${chalk.green(user.username)}`);
    log.raw(user.username);
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
