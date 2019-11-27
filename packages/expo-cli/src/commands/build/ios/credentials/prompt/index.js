import difference from 'lodash/difference';
import isObject from 'lodash/isObject';
import pickBy from 'lodash/pickBy';
import merge from 'lodash/merge';

import getFromParams from './getFromParams';
import promptForCredentials from './promptForCredentials';
import promptForOverrides from './promptForOverrides';
import * as constants from '../constants';
import log from '../../../../../log';
import _prompt from '../../../../../prompt';

async function prompt(appleCtx, options, missingCredentials, projectMetadata) {
  const credentialsFromParams = await getFromParams(options);
  const stillMissingCredentials = difference(
    missingCredentials,
    Object.keys(credentialsFromParams)
  );

  if (stillMissingCredentials.length === 0) {
    return {
      credentials: _flattenObject(credentialsFromParams),
      metadata: {},
    };
  }

  const names = stillMissingCredentials.map(id => constants.CREDENTIALS[id].name).join(', ');
  log.warn(`We are missing the following credentials from you: ${names}`);

  const { credentials: answers, metadata } = (await _shouldExpoGenerateCerts())
    ? await promptForOverrides(appleCtx, stillMissingCredentials, projectMetadata)
    : await promptForCredentials(appleCtx, stillMissingCredentials);

  const reused = Object.values(answers)
    .filter(i => isObject(i) && 'reuse' in i)
    .map(i => i.reuse);

  const userCredentialsIds = reused.map(i => i.userCredentialsId);
  const metadataFromReused = reused.reduce(
    (acc, { userCredentialsId, ...rest }) => ({ ...acc, ...rest }),
    {}
  );
  const toGenerate = Object.keys(answers).filter(
    key => answers[key] === constants.EXPO_WILL_GENERATE
  );

  const credentialsFromAnswers = pickBy(
    answers,
    val => val !== constants.EXPO_WILL_GENERATE && !(isObject(val) && 'reuse' in val)
  );

  const mergedCredentials = merge({}, credentialsFromParams, credentialsFromAnswers);
  const metadataToReturn = { ...metadata, ...metadataFromReused };

  return {
    credentials: _flattenObject(mergedCredentials),
    userCredentialsIds,
    metadata: metadataToReturn,
    toGenerate,
  };
}

async function _shouldExpoGenerateCerts() {
  const { expoShouldGenerateCerts } = await _prompt({
    type: 'list',
    name: 'expoShouldGenerateCerts',
    message: 'How would you like to upload your credentials?',
    choices: [
      {
        name: 'Expo handles all credentials, you can still provide overrides',
        value: true,
      },
      {
        name: 'I will provide all the credentials and files needed, Expo does limited validation',
        value: false,
      },
    ],
  });
  return expoShouldGenerateCerts;
}

const _flattenObject = obj => {
  return Object.keys(obj).reduce((acc, key) => {
    const value = obj[key];
    if (isObject(value)) {
      return { ...acc, ..._flattenObject(value) };
    } else {
      return { ...acc, [key]: value };
    }
  }, {});
};

export default prompt;
