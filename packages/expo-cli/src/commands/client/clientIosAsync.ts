import chalk from 'chalk';

import Log from '../../log';
import * as TerminalLink from '../utils/TerminalLink';

export async function actionAsync() {
  Log.newLine();

  Log.log(
    chalk.yellow(
      `${chalk.bold(`expo client:ios`)} has been replaced by ${chalk.bold`Expo Dev Clients`}.\n`
    ) + chalk.dim(TerminalLink.learnMore(`https://docs.expo.dev/development/getting-started`))
  );

  Log.newLine();
}
