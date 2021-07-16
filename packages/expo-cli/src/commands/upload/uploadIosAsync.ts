import chalk from 'chalk';

import Log from '../../log';
import * as TerminalLink from '../utils/TerminalLink';

export async function actionAsync() {
  const logItem = (name: string, link: string) => {
    Log.log(`\u203A ${TerminalLink.linkedText(name, link)}`);
  };

  Log.newLine();
  Log.log(chalk.yellow('expo upload:ios is no longer supported'));
  Log.log('Please use one of the following');
  Log.newLine();
  logItem(chalk.cyan.bold('eas submit'), 'https://docs.expo.io/submit/ios');
  logItem('Transporter', 'https://apps.apple.com/us/app/transporter/id1450874784');
  logItem(
    'Fastlane deliver',
    'https://docs.fastlane.tools/getting-started/ios/appstore-deployment'
  );
  Log.newLine();
}
