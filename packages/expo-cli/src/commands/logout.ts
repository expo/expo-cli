import { Command } from 'commander';
import { UserManager } from '@expo/xdl';

import log from '../log';

async function action() {
  try {
    await UserManager.logoutAsync();
    log('Success.');
  } catch (e) {
    throw new Error("Unexpected Error: Couldn't logout");
  }
}

export default function(program: Command) {
  program
    .command('logout')
    .description('Log out from your Expo account.')
    .asyncAction(action);
}
