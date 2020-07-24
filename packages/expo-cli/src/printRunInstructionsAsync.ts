import { UserManager } from '@expo/xdl';
import chalk from 'chalk';

import log from './log';

export default async function printRunInstructionsAsync(): Promise<void> {
  const user = await UserManager.getCurrentUserAsync();

  // If no user, we are offline and can't connect
  if (user) {
    log.newLine();
    log(chalk.bold('Instructions to open this project on a physical device'));
    log(`${chalk.underline('Android devices')}: scan the above QR code.`);
    log(
      `${chalk.underline('iOS devices')}: run ${chalk.bold(
        'expo send -s <your-email-address>'
      )} in this project directory in another terminal window to send the URL to your device.`
    );

    // NOTE(brentvatne) Uncomment this when we update iOS client
    // log(
    //   `Alternatively, sign in to your account (${chalk.bold(
    //     user.username
    //   )}) in the latest version of the Expo client on your iOS or Android device. Your projects will automatically appear in the "Projects" tab.`
    // );
  }

  log.newLine();
  log(chalk.bold('Instructions to open this project on a simulator'));
  log(
    `If you already have the simulator installed, run ${chalk.bold('expo ios')} or ${chalk.bold(
      'expo android'
    )} in this project directory in another terminal window.`
  );
  log.newLine();
}
