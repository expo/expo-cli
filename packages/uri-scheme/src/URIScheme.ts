#!/usr/bin/env node
import chalk from 'chalk';

import enquirer from 'enquirer';
import * as Android from './Android';
import * as Ios from './Ios';
import { Options } from './Options';

export function getAvailablePlatforms(projectRoot: string): string[] {
  let platforms: string[] = [];
  if (Ios.isAvailable(projectRoot)) platforms.push('ios');
  if (Android.isAvailable(projectRoot)) platforms.push('android');
  return platforms;
}

/**
 * Ensure the URI scheme is a valid string.
 *
 * @param uri URI scheme prefix to validate
 */
function ensureUriString(uri: any): string {
  if (!uri) {
    throw new Error('Please supply a URI protocol');
  }
  if (typeof uri !== 'string') {
    throw new Error(`URI protocol should be of type string. Instead got: ${typeof uri}`);
  }

  return uri.trim();
}

/**
 * Normalize a URI scheme prefix according to [RFC 2396](http://www.ietf.org/rfc/rfc2396.txt).
 *
 * @param uri URI scheme prefix to validate
 */
async function normalizeUriProtocolAsync(uri: any): Promise<string> {
  const trimmedUri = ensureUriString(uri);
  const [protocol] = trimmedUri.split(':');
  const normalizedUri = protocol.toLowerCase();
  if (normalizedUri !== uri) {
    // Create a warning.
    if (normalizedUri) {
      console.log(
        chalk.yellow(
          `\u203A Supplied URI protocol "${trimmedUri}" does not match normalized scheme "${normalizedUri}".`
        )
      );
      const { answer } = await enquirer.prompt({
        type: 'confirm',
        name: 'answer',
        message: `Would you like to use "${normalizedUri}" instead?`,
        initial: true,
      });
      if (answer) return normalizedUri;
    } else {
      throw new Error(
        `Supplied URI protocol "${trimmedUri}" does not appear to be spec compliant: http://www.ietf.org/rfc/rfc2396.txt`
      );
    }
  }
  return trimmedUri;
}

export async function addAsync(options: Options): Promise<void> {
  // Although schemes are case-insensitive, the canonical form is
  // lowercase and documents that specify schemes must do so with lowercase letters.
  options.uri = await normalizeUriProtocolAsync(options.uri);

  if (options.ios) {
    await Ios.addAsync(options);
    logPlatformMessage('iOS', `Added URI protocol "${options.uri}" to project`);
  }
  if (options.android) {
    await Android.addAsync(options);
    logPlatformMessage('Android', `Added URI protocol "${options.uri}" to project`);
  }
}

export async function removeAsync(options: Options): Promise<void> {
  options.uri = ensureUriString(options.uri);

  if (options.ios) {
    await Ios.removeAsync(options);
    logPlatformMessage('iOS', `Removed URI protocol "${options.uri}" from project`);
  }
  if (options.android) {
    await Android.removeAsync(options);
    logPlatformMessage('Android', `Removed URI protocol "${options.uri}" from project`);
  }
}

export async function openAsync(options: Options): Promise<void> {
  options.uri = ensureUriString(options.uri);

  if (options.ios) {
    logPlatformMessage('iOS', `Attempting to open URI "${options.uri}" in simulator`);
    await Ios.openAsync(options);
  }
  if (options.android) {
    logPlatformMessage('Android', `Attempting to open URI "${options.uri}" in emulator`);
    await Android.openAsync(options);
  }
}

export async function listAsync(options: Options): Promise<void> {
  if (options.ios) {
    const schemes = await Ios.getAsync(options);
    logPlatformMessage('iOS', `Schemes for config: ${Ios.getConfigPath(options.projectRoot)}`);
    logSchemes(schemes);
  }
  if (options.android) {
    const schemes = await Android.getAsync(options);
    logPlatformMessage(
      'Android',
      `Schemes for config: ${Android.getConfigPath(options.projectRoot)}`
    );
    logSchemes(schemes);
  }
}

function logPlatformMessage(platform: string, message: string): void {
  console.log(chalk.magenta(`\u203A ${chalk.bold(platform)}: ${message}`));
}
function logSchemes(schemes: string[]): void {
  for (const scheme of schemes) console.log(scheme);
  console.log('');
}
