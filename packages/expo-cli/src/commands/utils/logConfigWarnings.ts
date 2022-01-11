import chalk from 'chalk';

import * as TerminalLink from './TerminalLink';

export function formatNamedWarning(property: string, warning: string, link?: string) {
  return `- ${chalk.bold(property)}: ${warning}${
    link ? getSpacer(warning) + chalk.dim(TerminalLink.learnMore(link)) : ''
  }`;
}

function getSpacer(text: string) {
  if (text.endsWith('.')) {
    return ' ';
  } else {
    return '. ';
  }
}
