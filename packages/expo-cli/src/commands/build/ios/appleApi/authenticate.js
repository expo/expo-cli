import ora from 'ora';
import chalk from 'chalk';

import { runAction, travelingFastlane } from './fastlane';
import { nonEmptyInput } from '../../../utils/validators';
import log from '../../../../log';
import prompt from '../../../../prompt';

const APPLE_IN_HOUSE_TEAM_TYPE = 'in-house';

export default async function authenticate(options) {
  const { appleId, appleIdPassword } = await _requestAppleIdCreds(options);
  const spinner = ora(`Trying to authenticate with Apple Developer Portal...`).start();
  try {
    const { teams } = await runAction(travelingFastlane.authenticate, [appleId, appleIdPassword], {
      pipeStdout: true,
      onStdoutDataReceived: () => spinner.stop(),
    });
    spinner.succeed('Authenticated with Apple Developer Portal successfully!');
    const team = await _chooseTeam(teams, options.teamId);
    return { appleId, appleIdPassword, team };
  } catch (err) {
    spinner.fail('Authentication with Apple Developer Portal failed!');
    throw err;
  }
}

async function _requestAppleIdCreds(options) {
  return _getAppleIdFromParams(options) || (await _promptForAppleId());
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

async function _promptForAppleId() {
  log(`
We need your Apple ID/password to manage certificates, keys
and provisioning profiles from your Apple Developer account.

${chalk.blue('Note: Expo does not keep your Apple ID or your Apple ID password.')}
  `);

  const appleIdQuestions = [
    {
      type: 'input',
      name: 'appleId',
      message: `What's your Apple ID?`,
      validate: nonEmptyInput,
    },
    {
      type: 'password',
      name: 'appleIdPassword',
      message: `Password?`,
      validate: nonEmptyInput,
    },
  ];
  return await prompt(appleIdQuestions);
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
