import { UserManager } from '@expo/xdl';
import chalk from 'chalk';
import { Command } from 'commander';

import log from '../log';

async function action(command: Command) {
  const user = await UserManager.getCurrentUserAsync({ silent: true });
  if (user) {
    if (command.parent?.nonInteractive) {
      log.nested(user.username);
    } else {
      log.log(`Logged in as ${chalk.cyan(user.username)}`);
    }
  } else {
    log.log(`\u203A Not logged in, run ${chalk.cyan`expo login`} to authenticate`);
    process.exit(1);
  }
}

export default function (program: Command) {
  program
    .command('whoami')
    .helpGroup('auth')
    .alias('w')
    .description('Return the currently authenticated account')
    .asyncAction(action);
}
