import chalk from 'chalk';

import Log from '../../log';
import * as TerminalLink from '../utils/TerminalLink';

export async function actionAsync() {
  const logItem = (name: string, link: string) => {
    Log.log(`\u203A ${TerminalLink.linkedText(name, link)}`);
  };

  Log.newLine();
  Log.log(
    `${chalk.bold`expo upload:android`} has been moved to ${chalk.bold`eas submit`}. ${chalk.dim(
      TerminalLink.learnMore('https://expo.fyi/expo-upload-android')
    )}`
  );
  Log.newLine();
  Log.log('Run the following:');
  Log.newLine();
  Log.log('\u203A ' + chalk.cyan.bold('npm install -g eas-cli'));
  // Log.log('\u203A ' + chalk.cyan.bold('npm install -g eas-cli'));
  logItem(chalk.cyan.bold('eas submit -p android'), 'https://docs.expo.dev/submit/android');
  Log.newLine();
}
