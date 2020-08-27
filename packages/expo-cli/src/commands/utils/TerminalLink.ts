import terminalLink from 'terminal-link';

import log from '../../log';

/**
 * When linking isn't available, fallback to just displaying the URL.
 *
 * @example https://expo.io
 * @example [value](https://expo.io)
 *
 * @param value
 * @param url
 */
export function fallbackToUrl(value: string, url: string): string {
  return terminalLink(value, url, {
    fallback: (text, url) => url,
  });
}

/**
 * When linking isn't available, format the learn more link better.
 *
 * @example Learn more: https://expo.io
 * @example [Learn more](https://expo.io)
 * @param url
 */
export function learnMore(url: string): string {
  return terminalLink(log.chalk.underline('Learn more.'), url, {
    fallback: (text, url) => `Learn more: ${log.chalk.underline(url)}`,
  });
}
