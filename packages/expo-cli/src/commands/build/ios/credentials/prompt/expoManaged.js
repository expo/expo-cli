import { Credentials } from 'xdl';
import ora from 'ora';
import isObject from 'lodash/isObject';

import * as consts from '../constants';
import promptForCredentials from './userProvided';
import prompt from '../../../../../prompt';

const existingCredsGettersByType = {
  distributionCert: Credentials.getExistingDistCerts,
  pushKey: Credentials.getExistingPushKeys,
};

async function promptForOverrides(appleCtx, types) {
  const credentials = {};
  const toAskUserFor = [];
  for (const _type of types) {
    const definition = consts.CREDENTIALS[_type];
    const { dependsOn, name, canReuse } = definition;
    const shouldBeExpoGenerated =
      dependsOn &&
      !toAskUserFor.includes(dependsOn) &&
      types.includes(dependsOn) &&
      !(isObject(credentials[dependsOn]) && 'reuse' in credentials[dependsOn]);
    if (shouldBeExpoGenerated) {
      // if a user was missing Distribution Certificate
      // and he let Expo handle generating it
      // we must generate new Provisioning Profile
      // (and the user cannot provide his own file)
      credentials[_type] = consts.EXPO_WILL_GENERATE;
    } else if (await _willUserProvideCredentialsType(name)) {
      toAskUserFor.push(_type);
    } else {
      if (canReuse) {
        const choice = await _askIfWantsToReuse(appleCtx, definition);
        if (choice) {
          credentials[_type] = { reuse: choice };
        } else {
          credentials[_type] = consts.EXPO_WILL_GENERATE;
        }
      } else {
        credentials[_type] = consts.EXPO_WILL_GENERATE;
      }
    }
  }
  const userProvidedCredentials = await promptForCredentials(appleCtx, toAskUserFor, false);
  const credentialsToReturn = { ...credentials, ...userProvidedCredentials };
  return [credentialsToReturn, null];
}

async function _willUserProvideCredentialsType(name) {
  const { answer } = await prompt({
    type: 'list',
    name: 'answer',
    message: `Will you provide your own ${name}?`,
    choices: [
      { name: 'Let Expo handle the process', value: false },
      { name: 'I want to upload my own file', value: true },
    ],
  });
  return answer;
}

async function _askIfWantsToReuse(appleCtx, definition) {
  const { name } = definition;
  const existingCreds = await _getExistingCreds(appleCtx, definition);
  if (!existingCreds) {
    return null;
  }

  const newCertChoice = {
    name: 'No, please create a new one',
    value: null,
  };
  const choices = [newCertChoice, ...existingCreds];
  const { userChoice } = await prompt({
    type: 'list',
    name: 'userChoice',
    message: `Would you like to reuse ${name} from another app?`,
    choices,
  });
  return userChoice;
}

async function _getExistingCreds({ username, team: { id: appleTeamId } }, { id, name }) {
  const getter = existingCredsGettersByType[id];
  const spinner = ora(`Looking for ${name} you might have created before...`).start();
  try {
    const existingCreds = await getter(username, appleTeamId);
    if (existingCreds.length === 0) {
      spinner.succeed(`Didn't find any previously uploaded ${name}`);
      return null;
    } else {
      spinner.stop();
      return existingCreds;
    }
  } catch (err) {
    spinner.fail(`Failed when trying to find previously uploaded ${name}`);
    throw err;
  }
}

export default promptForOverrides;
