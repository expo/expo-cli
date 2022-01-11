import chalk from 'chalk';
import terminalLink from 'terminal-link';

/**
 * When linking isn't available, fallback to displaying the URL beside the
 * text in parentheses.
 *
 * @example [Expo](https://expo.dev)
 * @example Expo (https://expo.dev)
 *
 * @param value
 * @param url
 */
export function fallbackToTextAndUrl(text: string, url: string) {
  return terminalLink(text, url);
}

/**
 * When linking isn't available, fallback to just displaying the URL.
 *
 * @example [value](https://expo.dev)
 * @example https://expo.dev
 *
 * @param text
 * @param url
 */
export function fallbackToUrl(text: string, url: string): string {
  return terminalLink(text, url, {
    fallback: (_, url) => url,
  });
}

/**
 * When linking isn't available, format the learn more link better.
 *
 * @example [Learn more](https://expo.dev)
 * @example Learn more: https://expo.dev
 * @param url
 */
export function learnMore(url: string): string {
  return terminalLink(chalk.underline('Learn more.'), url, {
    fallback: (text, url) => `Learn more: ${chalk.underline(url)}`,
  });
}

export function linkedText(text: string, url: string): string {
  return terminalLink(text, url, {
    fallback: (text, url) => {
      return `${text} ${chalk.dim.underline(url)}`;
    },
  });
}

export function transporterAppLink() {
  return fallbackToTextAndUrl(
    'Transporter.app',
    'https://apps.apple.com/us/app/transporter/id1450874784'
  );
}
