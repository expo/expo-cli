import { WarningAggregator } from '@expo/config';
import chalk from 'chalk';
import log from '../../log';

export function logConfigWarningsIOS() {
  let warningsIOS = WarningAggregator.flushWarningsIOS();
  if (warningsIOS.length) {
    warningsIOS.forEach(([property, warning]) => {
      log.nested(chalk.yellow(`- ${chalk.bold(property)}: ${warning}`));
    });
  }

  return !!warningsIOS;
}

export function logConfigWarningsAndroid() {
  let warningsAndroid = WarningAggregator.flushWarningsAndroid();
  if (warningsAndroid.length) {
    warningsAndroid.forEach(([property, warning]) => {
      log.nested(chalk.yellow(`- ${chalk.bold(property)}: ${warning}`));
    });
  }

  return !!warningsAndroid;
}
