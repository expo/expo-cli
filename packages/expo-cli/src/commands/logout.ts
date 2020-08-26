import { UserManager } from '@expo/xdl';
import { Command } from 'commander';

import log from '../log';

async function action() {
  try {
    await UserManager.logoutAsync();
    log('Logged out');
  } catch (e) {
    throw new Error("Unexpected Error: Couldn't logout");
  }
}

export default function (program: Command) {
  program.command('logout').description('Logout from your Expo account').asyncAction(action);
}
