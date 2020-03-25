import { WarningAggregator } from '@expo/config';
import chalk from 'chalk';
import log from '../../log';

export function logConfigWarningsIOS() {
  let warningsIOS = WarningAggregator.flushWarningsIOS();
  if (warningsIOS.length) {
    log.nested(
      chalk.yellow(
        chalk.bold(
          `Your iOS project requires additional configuration for the following properties:`
        )
      )
    );
    warningsIOS.forEach(([property, warning]) => {
      log.nested(chalk.yellow(`- ${chalk.bold(property)}: ${warning}`));
    });
  } else {
    log.nested(chalk.green('All project configuration has been applied to your iOS project.'));
  }
}

export function logConfigWarningsAndroid() {
  let warningsAndroid = WarningAggregator.flushWarningsAndroid();
  if (warningsAndroid.length) {
    log.nested(
      chalk.yellow(
        chalk.bold(
          `Your Android project requires additional configuration for the following properties:`
        )
      )
    );
    warningsAndroid.forEach(([property, warning]) => {
      log.nested(chalk.yellow(`- ${chalk.bold(property)}: ${warning}`));
    });
  } else {
    log.nested(chalk.green('All project configuration has been applied to your Android project.'));
  }
}
