import { WarningAggregator } from '@expo/config';
import chalk from 'chalk';
import terminalLink from 'terminal-link';

import log from '../../log';

export function logConfigWarningsIOS() {
  const warningsIOS = WarningAggregator.flushWarningsIOS();
  if (warningsIOS.length) {
    warningsIOS.forEach(([property, warning, link]) => {
      log.nested(formatOutput(property, warning, link));
    });
  }

  return !!warningsIOS;
}

export function logConfigWarningsAndroid() {
  const warningsAndroid = WarningAggregator.flushWarningsAndroid();
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
