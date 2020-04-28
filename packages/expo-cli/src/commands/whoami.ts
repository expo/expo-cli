import { UserManager } from '@expo/xdl';
import chalk from 'chalk';
import { Command } from 'commander';

import log from '../log';

async function action() {
  const user = await UserManager.getCurrentUserAsync({ silent: true });
  if (user) {
    log(`Logged in as ${chalk.green(user.username)}`);
    log.raw(user.username);
  } else {
    log(`\u203A Not logged in, run ${chalk.cyan`expo login`} to authenticate`);
  }
}

export default function(program: Command) {
  program
    .command('whoami')
    .alias('w')
    .description('Checks with the server and then says who you are logged in as')
    .asyncAction(action);
}
