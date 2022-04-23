import chalk from 'chalk';
import { UserManager } from 'xdl';

import Log from '../../log';

export default async function printRunInstructionsAsync(): Promise<void> {
  const user = await UserManager.getCurrentUserAsync();

  // If no user, we are offline and can't connect
  if (user) {
    Log.newLine();
    Log.log(chalk.bold('Instructions to open this project on a physical device'));
    Log.log(`${chalk.underline('Android devices')}: scan the above QR code.`);
    Log.log(
      `${chalk.underline('iOS devices')}: run ${chalk.bold(
        'expo send -s <your-email-address>'
      )} in this project directory in another terminal window to send the URL to your device.`
    );

    // NOTE(brentvatne) Uncomment this when we update iOS client
    // log.log(
    //   `Alternatively, sign in to your account (${chalk.bold(
    //     user.username
    //   )}) in the latest version of Expo Go on your iOS or Android device. Your projects will automatically appear in the "Projects" tab.`
    // );
  }

  Log.newLine();
  Log.log(chalk.bold('Instructions to open this project on a simulator'));
  Log.log(
    `If you already have the simulator installed, run ${chalk.bold('expo ios')} or ${chalk.bold(
      'expo android'
    )} in this project directory in another terminal window.`
  );
  Log.newLine();
}
