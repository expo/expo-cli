import { WarningAggregator } from '@expo/config';
import chalk from 'chalk';
import terminalLink from 'terminal-link';

import log from '../../log';

type WarningArray = [string, string, string | undefined];

export function logWarningArray(warnings: WarningArray[]): boolean {
  if (warnings.length) {
    warnings.forEach(([property, warning, link]) => {
      log.nested(formatOutput(property, warning, link));
    });
  }

  return !!warnings;
}

export function logConfigWarningsIOS(): boolean {
  const warningsIOS = WarningAggregator.flushWarningsIOS();
  return logWarningArray(warningsIOS);
}

export function logConfigWarningsAndroid(): boolean {
  const warningsAndroid = WarningAggregator.flushWarningsAndroid();
  if (warningsAndroid.length) {
    warningsAndroid.forEach(([property, warning, link]) => {
      log.nested(formatOutput(property, warning, link));
    });
  }

  return !!warningsAndroid;
}

function formatOutput(property: string, warning: string, link: string | undefined): string {
  return `- ${chalk.bold(property)}: ${warning}${
    link ? getSpacer(warning) + terminalLink('Details.', link) : ''
  }`;
}

function getSpacer(text: string): string {
  if (text.endsWith('.')) {
    return ' ';
  } else {
    return '. ';
  }
}
