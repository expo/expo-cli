import chalk from 'chalk';

import Log from '../../log';
import * as TerminalLink from '../utils/TerminalLink';

const daysUntilDate = (date: string) => {
  const today = new Date();
  const eventDate = new Date(date);
  const timeDiff = eventDate.getTime() - today.getTime();
  if (timeDiff < 0) {
    return 0;
  }
  const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
  return diffDays;
};

export function logBuildMigration(platform: string) {
  Log.newLine();
  const command = chalk.bold(`expo build:${platform}`);
  Log.log(
    `${command} has been superseded by ${chalk.bold`eas build`}. ${chalk.dim(
      TerminalLink.learnMore(`https://blog.expo.dev/turtle-goes-out-to-sea-d334db2a6b60`)
    )}`
  );
  Log.newLine();
  Log.log('Run the following:');
  Log.newLine();
  Log.log('\u203A ' + chalk.cyan.bold('npm install -g eas-cli'));
  Log.log(
    `\u203A ${TerminalLink.linkedText(
      chalk.cyan.bold(`eas build -p ${platform}`),
      `https://docs.expo.dev/build-reference/${platform}-builds/`
    )}`
  );

  const endDate = 'January 4, 2023';
  const daysLeft = daysUntilDate(endDate);
  Log.newLine();

  if (daysLeft) {
    Log.log(
      `${command} will be discontinued on ${chalk.bold(endDate)} (${daysLeft} day${
        daysLeft === 1 ? '' : 's'
      } left).`
    );
  } else {
    Log.log(chalk.red(`${command} has been discontinued (${chalk.bold(endDate)}).`));
  }
  Log.newLine();
}
