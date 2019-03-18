import chalk from 'chalk';
import wordwrap from 'wordwrap';

import { runAction, travelingFastlane } from './fastlane';
import { nonEmptyInput } from '../../../utils/validators';
import log from '../../../../log';
import prompt from '../../../../prompt';

const APPLE_IN_HOUSE_TEAM_TYPE = 'in-house';

export default async function authenticate(options) {
  const { appleId, appleIdPassword } = await _requestAppleIdCreds(options);
  try {
    log('Trying to authenticate with Apple Developer Portal...');
    const { teams, fastlaneSession } = await runAction(
      travelingFastlane.authenticate,
      [appleId, appleIdPassword],
      {
        pipeStdout: true,
      }
    );
    log('Authenticated with Apple Developer Portal successfully!');
    const team = await _chooseTeam(teams, options.teamId);
    return { appleId, appleIdPassword, team, fastlaneSession };
  } catch (err) {
    log('Authentication with Apple Developer Portal failed!');
    throw err;
  }
}

async function _requestAppleIdCreds(options) {
  return _getAppleIdFromParams(options) || (await _promptForAppleId(options));
}

function _getAppleIdFromParams({ appleId }) {
  const appleIdPassword = process.env.EXPO_APPLE_PASSWORD;
  if (appleId && appleIdPassword) {
    return {
      appleId,
      appleIdPassword,
    };
  } else {
    return null;
  }
}

async function _promptForAppleId({ appleId }) {
  let wrap = wordwrap(process.stdout.columns || 80);
  log(
    wrap(
      'Please enter your Apple Developer Program account credentials. ' +
        'These credentials are needed to manage certificates, keys and provisioning profiles ' +
        'in your Apple Developer account.'
    )
  );

  log(wrap(chalk.bold('The password is only used to authenticate with Apple and never stored.')));

  if (!appleId) {
    ({ appleId } = await prompt(
      {
        type: 'input',
        name: 'appleId',
        message: `Apple ID:`,
        validate: nonEmptyInput,
      },
      {
        nonInteractiveHelp: 'Pass your Apple ID using the --apple-id flag.',
      }
    ));
  }
  let { appleIdPassword } = await prompt(
    {
      type: 'password',
      name: 'appleIdPassword',
      message: answer => `Password (for ${appleId}):`,
      validate: nonEmptyInput,
    },
    {
      nonInteractiveHelp:
        'Pass your Apple ID password using the EXPO_APPLE_PASSWORD environment variable',
    }
  );
  return { appleId, appleIdPassword };
}

async function _chooseTeam(teams, userProvidedTeamId) {
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
    const { team } = await prompt({
      type: 'list',
      name: 'team',
      message: 'Which team would you like to use?',
      choices,
    });
    return _formatTeam(team);
  }
}

const _formatTeam = ({ teamId, name, type }) => ({
  id: teamId,
  name: `${name} (${type})`,
  inHouse: type.toLowerCase() === APPLE_IN_HOUSE_TEAM_TYPE,
});
