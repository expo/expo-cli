import { PackageJSONConfig } from '@expo/config';
import { WarningAggregator } from '@expo/config-plugins';
import chalk from 'chalk';

import log from '../../log';
import * as TerminalLink from './TerminalLink';

export function logConfigWarningsIOS() {
  const warningsIOS = WarningAggregator.flushWarningsIOS();
  if (warningsIOS.length) {
    warningsIOS.forEach(([property, warning, link]) => {
      log.nested(formatNamedWarning(property, warning, link));
    });
  }

  return !!warningsIOS;
}

export function logConfigWarningsAndroid() {
  const warningsAndroid = WarningAggregator.flushWarningsAndroid();
  if (warningsAndroid.length) {
    warningsAndroid.forEach(([property, warning, link]) => {
      log.nested(formatNamedWarning(property, warning, link));
    });
  }

  return !!warningsAndroid;
}

export function formatNamedWarning(property: string, warning: string, link?: string) {
  return `- ${chalk.bold(property)}: ${warning}${
    link ? getSpacer(warning) + log.chalk.dim(TerminalLink.learnMore(link)) : ''
  }`;
}

function getSpacer(text: string) {
  if (text.endsWith('.')) {
    return ' ';
  } else {
    return '. ';
  }
}

/**
 * Warn users if they attempt to export or publish in a bare project that may also
 * be using the Expo client and does not if the developer does not have the Expo
 * package installed (without it, there is no way the project will run in the Expo
 * client. We should revisit this with dev client, and possibly also by excluding SDK
 * version for bare expo-updates usage in the future (and then surfacing this
 * as an error in the Expo client app instead)
 *
 * Related: https://github.com/expo/expo/issues/9517
 *
 * @param pkg         package.json
 * @param commandName name of the command to warn about
 */
export function logBareWorkflowWarnings(pkg: PackageJSONConfig, commandName: string) {
  const hasExpoInstalled = pkg.dependencies?.['expo'];
  if (!hasExpoInstalled) {
    return;
  }
  log.nestedWarn(
    formatNamedWarning(
      'Workflow target',
      `This is a ${chalk.bold(
        'bare workflow'
      )} project. The resulting ${commandName} will only run properly inside of a native build of your project. If you want to ${commandName} a version of your app that will run in the Expo client, please use ${chalk.bold(
        `expo ${commandName} --target managed`
      )}. You can skip this warning by explicitly running ${chalk.bold(
        `expo ${commandName} --target bare`
      )} in the future.`
    )
  );
}
