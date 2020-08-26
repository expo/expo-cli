import { UserSettings } from '@expo/xdl';
import chalk from 'chalk';
import getenv from 'getenv';
// @ts-ignore
import keychain from 'keychain';
import terminalLink from 'terminal-link';
import wordwrap from 'wordwrap';

import log from '../log';
import prompt from '../prompt';
import { nonEmptyInput } from '../validators';
import { runAction, travelingFastlane } from './fastlane';

const NO_STORE_PASSWORD = getenv.boolish('EXPO_NO_STORE_PASSWORD', false);

function getKeychainServiceName(appleId: string): string {
  return `deliver.${appleId}`;
}

async function deletePasswordAsync({
  appleId,
}: Pick<AppleCredentials, 'appleId'>): Promise<boolean> {
  const keychainService = getKeychainServiceName(appleId);
  return new Promise((resolve, reject) => {
    keychain.deletePassword(
      { account: appleId, service: keychainService, type: 'internet' },
      (error: Error) => {
        if (error) {
          if (error.message.match(/Could not find password/)) {
            return resolve(false);
          }
          reject(error);
        } else {
          log('Removed Apple ID password from the native key chain.');
          resolve(true);
        }
      }
    );
  });
}

async function getPasswordAsync({
  appleId,
}: Pick<AppleCredentials, 'appleId'>): Promise<string | null> {
  if (NO_STORE_PASSWORD) {
    await deletePasswordAsync({ appleId });
    return null;
  }

  const keychainService = getKeychainServiceName(appleId);
  return new Promise((resolve, reject) => {
    keychain.getPassword(
      { account: appleId, service: keychainService, type: 'internet' },
      (error: Error, password: string) => {
        if (error) {
          if (error.message.match(/Could not find password/)) {
            return resolve(null);
          }
          reject(error);
        } else {
          resolve(password);
        }
      }
    );
  });
}

async function storePasswordAsync({
  appleId,
  appleIdPassword,
}: AppleCredentials): Promise<boolean> {
  if (NO_STORE_PASSWORD) {
    log('Skip storing Apple ID password in the native key chain.');
    return false;
  }
  log(
    'Saving Apple ID password to the local native key chain. You can disable this with `EXPO_NO_STORE_PASSWORD=true`'
  );
  const keychainService = getKeychainServiceName(appleId);
  return new Promise((resolve, reject) => {
    keychain.setPassword(
      { account: appleId, service: keychainService, type: 'internet', password: appleIdPassword },
      (error: Error) => {
        if (error) {
          reject(error);
        } else {
          resolve(true);
        }
      }
    );
  });
}

const APPLE_IN_HOUSE_TEAM_TYPE = 'in-house';

export type Options = {
  appleIdPassword?: string;
  appleId?: string;
  teamId?: string;
};

type AppleCredentials = {
  appleIdPassword: string;
  appleId: string;
};

export type Team = {
  id: string;
  name?: string;
  inHouse?: boolean;
};

type FastlaneTeam = {
  name: string;
  teamId: string;
  status: string;
  type: string;
};

export type AppleCtx = {
  appleId: string;
  appleIdPassword: string;
  team: Team;
  fastlaneSession: string;
};

export async function authenticate(options: Options = {}): Promise<AppleCtx> {
  const { appleId, appleIdPassword } = await requestAppleIdCreds(options);
  log(`Authenticating to Apple Developer Portal...`); // use log instead of spinner in case we need to prompt user for 2fa
  try {
    const { teams, fastlaneSession } = await runAction(
      travelingFastlane.authenticate,
      [appleId, appleIdPassword],
      {
        pipeStdout: true,
      }
    );
    log(chalk.green('Authenticated with Apple Developer Portal successfully!'));
    const team = await _chooseTeam(teams, options.teamId);
    return { appleId, appleIdPassword, team, fastlaneSession };
  } catch (err) {
    if (err.rawDump?.match(/Invalid username and password combination/)) {
      log(chalk.red('Invalid username and password combination, try again.'));
      const anotherPromptResult = await _promptForAppleId({
        firstAttempt: false,
        previousAppleId: appleId,
      });
      return authenticate({ ...options, ...anotherPromptResult });
    }
    log(chalk.red('Authentication with Apple Developer Portal failed!'));
    throw err;
  }
}

export async function requestAppleIdCreds(options: Options): Promise<AppleCredentials> {
  return _getAppleIdFromParams(options) || (await _promptForAppleId());
}

function _getAppleIdFromParams({ appleId, appleIdPassword }: Options): AppleCredentials | null {
  const passedAppleIdPassword = appleId
    ? appleIdPassword || process.env.EXPO_APPLE_PASSWORD || process.env.EXPO_APPLE_ID_PASSWORD
    : undefined;

  if (process.env.EXPO_APPLE_ID_PASSWORD) {
    log.error('EXPO_APPLE_ID_PASSWORD is deprecated, please use EXPO_APPLE_PASSWORD instead!');
  }

  // none of the apple id params were set, assume user has no intention of passing it in
  if (!appleId) {
    return null;
  }

  // partial apple id params were set, assume user has intention of passing it in
  if (!(appleId && passedAppleIdPassword)) {
    throw new Error(
      'In order to provide your Apple ID credentials, you must set the --apple-id flag and set the EXPO_APPLE_PASSWORD environment variable.'
    );
  }

  return {
    appleId: appleId as string,
    appleIdPassword: passedAppleIdPassword as string,
  };
}

async function getLastUsedAppleIdAsync(): Promise<string | undefined> {
  if (NO_STORE_PASSWORD) {
    // Clear last used apple ID.
    await UserSettings.deleteKeyAsync('appleId');
    return undefined;
  }

  let lastAppleId: string | undefined = undefined;
  try {
    // @ts-ignore
    lastAppleId = (await UserSettings.getAsync('appleId')) ?? '';
  } catch {}

  return lastAppleId;
}

async function _promptForAppleId({
  firstAttempt = true,
  previousAppleId,
}: { firstAttempt?: boolean; previousAppleId?: string } = {}): Promise<AppleCredentials> {
  if (firstAttempt) {
    const wrap = wordwrap(process.stdout.columns || 80);
    log(
      wrap(
        'Please enter your Apple Developer Program account credentials. ' +
          'These credentials are needed to manage certificates, keys and provisioning profiles ' +
          `in your Apple Developer account.`
      )
    );

    // https://docs.expo.io/distribution/security/#apple-developer-account-credentials
    const here = terminalLink('here', 'https://bit.ly/2VtGWhU');
    log(wrap(chalk.bold(`The password is only used to authenticate with Apple`)));
    log(wrap(chalk.grey(`Learn more ${here}`)));
  }

  const lastAppleId = await getLastUsedAppleIdAsync();

  const { appleId: promptAppleId } = await prompt(
    {
      type: 'input',
      name: 'appleId',
      message: `Apple ID:`,
      validate: nonEmptyInput,
      default: lastAppleId as string,
      ...(previousAppleId && { default: previousAppleId }),
    },
    {
      nonInteractiveHelp: 'Pass your Apple ID using the --apple-id flag.',
    }
  );

  if (!NO_STORE_PASSWORD && lastAppleId !== promptAppleId) {
    await UserSettings.setAsync('appleId', promptAppleId);
  }

  // Only check on the first attempt in case the user changed their password.
  if (firstAttempt) {
    const password = await getPasswordAsync({ appleId: promptAppleId });

    if (password) {
      return { appleId: promptAppleId, appleIdPassword: password };
    }
  }
  const { appleIdPassword } = await prompt(
    {
      type: 'password',
      name: 'appleIdPassword',
      message: () => `Password (for ${promptAppleId}):`,
      validate: nonEmptyInput,
    },
    {
      nonInteractiveHelp:
        'Pass your Apple ID password using the EXPO_APPLE_PASSWORD environment variable',
    }
  );

  await storePasswordAsync({ appleId: promptAppleId, appleIdPassword });

  return { appleId: promptAppleId, appleIdPassword };
}

async function _chooseTeam(teams: FastlaneTeam[], userProvidedTeamId?: string): Promise<Team> {
  if (teams.length === 0) {
    throw new Error(`You have no team associated with your Apple account, cannot proceed.
(Do you have a paid Apple Developer account?)`);
  }

  if (userProvidedTeamId) {
    const foundTeam = teams.find(({ teamId }) => teamId === userProvidedTeamId);
    if (foundTeam) {
      log(`Using Apple Team with ID: ${userProvidedTeamId}`);
      return _formatTeam(foundTeam);
    } else {
      log.warn(`Your account is not associated with Apple Team with ID: ${userProvidedTeamId}`);
    }
  }

  if (teams.length === 1) {
    const [team] = teams;
    log(`Only 1 team associated with your account, using Apple Team with ID: ${team.teamId}`);
    return _formatTeam(team);
  } else {
    log(`You have ${teams.length} teams associated with your account`);
    const choices = teams.map((team, i) => ({
      name: `${i + 1}) ${team.teamId} "${team.name}" (${team.type})`,
      value: team,
    }));
    const { team } = await prompt(
      {
        type: 'list',
        name: 'team',
        message: 'Which team would you like to use?',
        choices,
      },
      {
        nonInteractiveHelp: 'Pass in your Apple Team ID using the --team-id flag.',
      }
    );
    return _formatTeam(team);
  }
}

function _formatTeam({ teamId, name, type }: FastlaneTeam): Team {
  return {
    id: teamId,
    name: `${name} (${type})`,
    inHouse: type.toLowerCase() === APPLE_IN_HOUSE_TEAM_TYPE,
  };
}
