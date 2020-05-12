import ora from 'ora';
import chalk from 'chalk';
import terminalLink from 'terminal-link';
import wordwrap from 'wordwrap';

import { every, some } from 'lodash';
import invariant from 'invariant';
import { runAction, travelingFastlane } from './fastlane';
import { nonEmptyInput } from '../validators';
import log from '../log';
import prompt from '../prompt';

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
  const { appleId, appleIdPassword } = await _requestAppleIdCreds(options);
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
    log(chalk.red('Authentication with Apple Developer Portal failed!'));
    throw err;
  }
}

async function _requestAppleIdCreds(options: Options): Promise<AppleCredentials> {
  return _getAppleIdFromParams(options) || (await _promptForAppleId());
}

function _getAppleIdFromParams({ appleId, appleIdPassword }: Options): AppleCredentials | null {
  const passedAppleIdPassword = appleIdPassword || process.env.EXPO_APPLE_PASSWORD;

  // none of the apple id params were set, assume user has no intention of passing it in
  if (!some([appleId, passedAppleIdPassword])) {
    return null;
  }

  // partial apple id params were set, assume user has intention of passing it in
  if (!every([appleId, passedAppleIdPassword])) {
    throw new Error(
      'In order to provide your Apple ID credentials, you must set the --apple-id flag and set the EXPO_APPLE_PASSWORD environment variable.'
    );
  }

  return {
    appleId: appleId as string,
    appleIdPassword: passedAppleIdPassword as string,
  };
}

async function _promptForAppleId(): Promise<AppleCredentials> {
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
  log(wrap(chalk.bold(`The password is only used to authenticate with Apple and never stored`)));
  log(wrap(chalk.grey(`Learn more ${here}`)));

  const { appleId: promptAppleId } = await prompt(
    {
      type: 'input',
      name: 'appleId',
      message: `Apple ID:`,
      validate: nonEmptyInput,
    },
    {
      nonInteractiveHelp: 'Pass your Apple ID using the --apple-id flag.',
    }
  );
  const { appleIdPassword } = await prompt(
    {
      type: 'password',
      name: 'appleIdPassword',
      message: answer => `Password (for ${promptAppleId}):`,
      validate: nonEmptyInput,
    },
    {
      nonInteractiveHelp:
        'Pass your Apple ID password using the EXPO_APPLE_PASSWORD environment variable',
    }
  );
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
