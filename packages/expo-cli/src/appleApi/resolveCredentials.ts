import { Auth, JsonFileCache } from '@expo/apple-utils';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import wrapAnsi from 'wrap-ansi';

import CommandError from '../CommandError';
import { learnMore } from '../commands/utils/TerminalLink';
import Log from '../log';
import promptAsync from '../utils/prompts';
import * as Keychain from './keychain';

/**
 * Get the username and possibly the password from the environment variables or the supplied options.
 * Password is optional because it's only needed for authentication, but not for re-authentication.
 *
 * @param options
 */
export async function resolveCredentialsAsync(
  options: Partial<Auth.UserCredentials>
): Promise<Partial<Auth.UserCredentials>> {
  const credentials = getAppleIdFromEnvironmentOrOptions(options);

  if (!credentials.username) {
    credentials.username = await promptUsernameAsync();
  }

  return credentials;
}

function getAppleIdFromEnvironmentOrOptions({
  username,
  password,
  ...userCredentials
}: Partial<Auth.UserCredentials>): Partial<Auth.UserCredentials> {
  const passedAppleId = username || process.env.EXPO_APPLE_ID;
  const passedAppleIdPassword = passedAppleId
    ? password || process.env.EXPO_APPLE_PASSWORD || process.env.EXPO_APPLE_ID_PASSWORD
    : undefined;

  if (process.env.EXPO_APPLE_ID_PASSWORD) {
    Log.error('EXPO_APPLE_ID_PASSWORD is deprecated, please use EXPO_APPLE_PASSWORD instead!');
  }

  // partial apple id params were set, assume user has intention of passing it in
  if (process.env.EXPO_APPLE_ID && !passedAppleIdPassword) {
    throw new CommandError(
      'In order to provide your Apple ID credentials, you must set the --apple-id flag and set the EXPO_APPLE_PASSWORD environment variable.'
    );
  }
  return {
    ...userCredentials,
    username: passedAppleId,
    password: passedAppleIdPassword,
  };
}

async function promptUsernameAsync(): Promise<string> {
  Log.log('\u203A Log in to your Apple Developer account to continue');

  // Get the email address that was last used and set it as
  // the default value for quicker authentication.
  const lastAppleId = await getCachedUsernameAsync();

  const { username } = await promptAsync({
    type: 'text',
    name: 'username',
    message: `Apple ID:`,
    validate: (val: string) => val !== '',
    initial: lastAppleId ?? undefined,
  });

  if (username && username !== lastAppleId) {
    await cacheUsernameAsync(username);
  }

  return username;
}

async function cacheUsernameAsync(username: string): Promise<void> {
  // If a new email was used then store it as a suggestion for next time.
  // This functionality is disabled using the keychain mechanism.
  if (!Keychain.EXPO_NO_KEYCHAIN && username) {
    const cachedPath = JsonFileCache.usernameCachePath();
    await JsonFileCache.cacheAsync(cachedPath, { username });
  }
}

export async function promptPasswordAsync({
  username,
}: Pick<Auth.UserCredentials, 'username'>): Promise<string> {
  const cachedPassword = await getCachedPasswordAsync({ username });

  if (cachedPassword) {
    Log.log(`\u203A Using password for ${username} from your local Keychain`);
    Log.log(`  ${learnMore('https://docs.expo.dev/distribution/security#keychain')}`);
    return cachedPassword;
  }

  // https://docs.expo.dev/distribution/security/#apple-developer-account-credentials
  Log.log(
    wrapAnsi(
      chalk.bold(
        `\u203A The password is only used to authenticate with Apple and never stored on EAS servers`
      ),
      process.stdout.columns || 80
    )
  );
  Log.log(`  ${learnMore('https://bit.ly/2VtGWhU')}`);

  const { password } = await promptAsync({
    type: 'password',
    name: 'password',
    message: () => `Password (for ${username}):`,
    validate: (val: string) => val !== '',
  });

  // TODO: Save only after the auth completes successfully.
  await cachePasswordAsync({ username, password });
  return password;
}

async function getCachedUsernameAsync(): Promise<string | null> {
  if (Keychain.EXPO_NO_KEYCHAIN) {
    // Clear last used apple ID.
    await fs.remove(JsonFileCache.usernameCachePath());
    return null;
  }
  const cached = await JsonFileCache.getCacheAsync(JsonFileCache.usernameCachePath());
  const lastAppleId = cached?.username ?? null;
  return typeof lastAppleId === 'string' ? lastAppleId : null;
}

/**
 * Returns the same prefix used by Fastlane in order to potentially share access between services.
 * [Cite. Fastlane](https://github.com/fastlane/fastlane/blob/f831062fa6f4b216b8ee38949adfe28fc11a0a8e/credentials_manager/lib/credentials_manager/account_manager.rb#L8).
 *
 * @param appleId email address
 */
function getKeychainServiceName(appleId: string): string {
  return `deliver.${appleId}`;
}

export async function deletePasswordAsync({
  username,
}: Pick<Auth.UserCredentials, 'username'>): Promise<boolean> {
  const serviceName = getKeychainServiceName(username);
  const success = await Keychain.deletePasswordAsync({ username, serviceName });
  if (success) {
    Log.log('\u203A Removed Apple ID password from the native Keychain');
  }
  return success;
}

async function getCachedPasswordAsync({
  username,
}: Pick<Auth.UserCredentials, 'username'>): Promise<string | null> {
  // If the user opts out, delete the password.
  if (Keychain.EXPO_NO_KEYCHAIN) {
    await deletePasswordAsync({ username });
    return null;
  }

  const serviceName = getKeychainServiceName(username);
  return Keychain.getPasswordAsync({ username, serviceName });
}

async function cachePasswordAsync({ username, password }: Auth.UserCredentials): Promise<boolean> {
  if (Keychain.EXPO_NO_KEYCHAIN) {
    Log.log('\u203A Skip storing Apple ID password in the local Keychain.');
    return false;
  }

  Log.log(`\u203A Saving Apple ID password to the local Keychain`);
  Log.log(`  ${learnMore('https://docs.expo.dev/distribution/security#keychain')}`);
  const serviceName = getKeychainServiceName(username);
  return Keychain.setPasswordAsync({ username, password, serviceName });
}
