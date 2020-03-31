import terminalLink from 'terminal-link';
import { WarningAggregator } from '@expo/config';
import chalk from 'chalk';
import log from '../../log';

type WarningArray = [string, string, string | undefined];

export function logWarningArray(warnings: Array<WarningArray>) {
  if (warnings.length) {
    warnings.forEach(([property, warning, link]) => {
      log.nested(formatOutput(property, warning, link));
    });
  }

  return !!warnings;
}

export function logConfigWarningsIOS() {
  let warningsIOS = WarningAggregator.flushWarningsIOS();
  return logWarningArray(warningsIOS);
}

export function logConfigWarningsAndroid() {
  let warningsAndroid = WarningAggregator.flushWarningsAndroid();
  if (warningsAndroid.length) {
    warningsAndroid.forEach(([property, warning, link]) => {
      log.nested(formatOutput(property, warning, link));
    });
  }

  return !!warningsAndroid;
}

function formatOutput(property: string, warning: string, link: string | undefined) {
  return `- ${chalk.bold(property)}: ${warning}${
    link ? getSpacer(warning) + terminalLink('Details.', link) : ''
  }`;
}

function getSpacer(text: string) {
  if (text.endsWith('.')) {
    return ' ';
  } else {
    return '. ';
  }
}
