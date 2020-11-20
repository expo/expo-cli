import { UserSettings } from '@expo/xdl';
import chalk from 'chalk';
import wordwrap from 'wordwrap';

import { learnMore } from '../commands/utils/TerminalLink';
import log from '../log';
import prompt from '../prompts';
import { nonEmptyInput } from '../validators';
import { runAction, travelingFastlane } from './fastlane';
import * as Keychain from './keychain';

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
  const passedAppleId = appleId || process.env.EXPO_APPLE_ID;
  const passedAppleIdPassword = passedAppleId
    ? appleIdPassword || process.env.EXPO_APPLE_PASSWORD || process.env.EXPO_APPLE_ID_PASSWORD
    : undefined;

  if (process.env.EXPO_APPLE_ID_PASSWORD) {
    log.error('EXPO_APPLE_ID_PASSWORD is deprecated, please use EXPO_APPLE_PASSWORD instead!');
  }

  // none of the apple id params were set, assume user has no intention of passing it in
  if (!passedAppleId) {
    return null;
  }

  // partial apple id params were set, assume user has intention of passing it in
  if (!passedAppleIdPassword) {
    throw new Error(
      'In order to provide your Apple ID credentials, you must set the --apple-id flag and set the EXPO_APPLE_PASSWORD environment variable.'
    );
  }

  return {
    appleId: passedAppleId as string,
    appleIdPassword: passedAppleIdPassword as string,
  };
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
    log(
      wrap(
        chalk.bold(
          `The password is only used to authenticate with Apple and never stored on Expo servers`
        )
      )
    );
    log(wrap(chalk.dim(learnMore('https://bit.ly/2VtGWhU'))));
  }

  // Get the email address that was last used and set it as
  // the default value for quicker authentication.
  const lastAppleId = await getLastUsedAppleIdAsync();

  const { appleId: promptAppleId } = await prompt(
    {
      type: 'text',
      name: 'appleId',
      message: `Apple ID:`,
      validate: nonEmptyInput,
      initial: lastAppleId ?? undefined,
      ...(previousAppleId && { initial: previousAppleId }),
    },
    {
      nonInteractiveHelp: 'Pass your Apple ID using the --apple-id flag.',
    }
  );

  // If a new email was used then store it as a suggestion for next time.
  // This functionality is disabled using the keychain mechanism.
  if (!Keychain.EXPO_NO_KEYCHAIN && promptAppleId && lastAppleId !== promptAppleId) {
    await UserSettings.setAsync('appleId', promptAppleId);
  }

  // Only check on the first attempt in case the user changed their password.
  if (firstAttempt) {
    const password = await getPasswordAsync({ appleId: promptAppleId });

    if (password) {
      log(
        `Using password from your local Keychain. ${chalk.dim(
          `Learn more ${chalk.underline('https://docs.expo.io/distribution/security#keychain')}`
        )}`
      );
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

  await setPasswordAsync({ appleId: promptAppleId, appleIdPassword });

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
      title: `${i + 1}) ${team.teamId} "${team.name}" (${team.type})`,
      value: team,
    }));
    const { team } = await prompt(
      {
        type: 'select',
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

async function getLastUsedAppleIdAsync(): Promise<string | null> {
  if (Keychain.EXPO_NO_KEYCHAIN) {
    // Clear last used apple ID.
    await UserSettings.deleteKeyAsync('appleId');
    return null;
  }
  try {
    // @ts-ignore: appleId syncing issue
    const lastAppleId = (await UserSettings.getAsync('appleId')) ?? null;
    if (typeof lastAppleId === 'string') {
      return lastAppleId;
    }
  } catch {}
  return null;
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

async function deletePasswordAsync({
  appleId,
}: Pick<AppleCredentials, 'appleId'>): Promise<boolean> {
  const serviceName = getKeychainServiceName(appleId);
  const success = await Keychain.deletePasswordAsync({ username: appleId, serviceName });
  if (success) {
    log('Removed Apple ID password from the native Keychain.');
  }
  return success;
}

async function getPasswordAsync({
  appleId,
}: Pick<AppleCredentials, 'appleId'>): Promise<string | null> {
  // If the user opts out, delete the password.
  if (Keychain.EXPO_NO_KEYCHAIN) {
    await deletePasswordAsync({ appleId });
    return null;
  }

  const serviceName = getKeychainServiceName(appleId);
  return Keychain.getPasswordAsync({ username: appleId, serviceName });
}

async function setPasswordAsync({ appleId, appleIdPassword }: AppleCredentials): Promise<boolean> {
  if (Keychain.EXPO_NO_KEYCHAIN) {
    log('Skip storing Apple ID password in the local Keychain.');
    return false;
  }

  log(
    `Saving Apple ID password to the local Keychain. ${chalk.dim(
      `Learn more ${chalk.underline('https://docs.expo.io/distribution/security#keychain')}`
    )}`
  );
  const serviceName = getKeychainServiceName(appleId);
  return Keychain.setPasswordAsync({ username: appleId, password: appleIdPassword, serviceName });
}
