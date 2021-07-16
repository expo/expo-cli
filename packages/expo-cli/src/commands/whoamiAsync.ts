import chalk from 'chalk';
import { UserManager } from 'xdl';

import Log from '../log';

export type Options = {
  parent?: {
    nonInteractive: boolean;
  };
};

export async function actionAsync(command: Options) {
  const user = await UserManager.getCurrentUserAsync({ silent: true });
  if (user) {
    if (command.parent?.nonInteractive) {
      Log.nested(user.username);
    } else {
      Log.log(`Logged in as ${chalk.cyan(user.username)}`);
    }
  } else {
    Log.log(`\u203A Not logged in, run ${chalk.cyan`expo login`} to authenticate`);
    process.exit(1);
  }
}
