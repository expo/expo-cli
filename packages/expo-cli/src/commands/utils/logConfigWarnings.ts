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
