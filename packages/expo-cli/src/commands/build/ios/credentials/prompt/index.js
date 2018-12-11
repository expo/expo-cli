import _ from 'lodash';

import getFromParams from './paramsProvided';
import promptForCredentials from './userProvided';
import promptForOverrides from './expoManaged';
import * as consts from '../constants';
import log from '../../../../../log';
import _prompt from '../../../../../prompt';

async function prompt(appleCtx, options, missingCredentials) {
  const credentialsFromParams = await getFromParams(options);
  const stillMissingCredentials = _.difference(
    missingCredentials,
    Object.keys(credentialsFromParams)
  );

  const names = stillMissingCredentials.map(id => consts.CREDENTIALS[id].name).join(', ');
  log.warn(`We do not have some credentials for you: ${names}`);

  const [answers, metadata] = (await _shouldExpoGenerateCerts())
    ? await promptForOverrides(appleCtx, stillMissingCredentials)
    : await promptForCredentials(appleCtx, stillMissingCredentials);

  const reused = Object.values(answers)
    .filter(i => _.isObject(i) && 'reuse' in i)
    .map(i => i.reuse);

  const userCredentialsIds = reused.map(i => i.userCredentialsId);
  const metadataFromReused = reused.reduce(
    (acc, { userCredentialsId, ...rest }) => ({ ...acc, ...rest }),
    {}
  );
  const toGenerate = Object.keys(answers).filter(key => answers[key] === consts.EXPO_WILL_GENERATE);

  const credentialsFromAnswers = _.pickBy(
    answers,
    val => val !== consts.EXPO_WILL_GENERATE && !(_.isObject(val) && 'reuse' in val)
  );

  const mergedCredentials = _.merge({}, credentialsFromParams, credentialsFromAnswers);
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
    if (_.isObject(value)) {
      return { ...acc, ..._flattenObject(value) };
    } else {
      return { ...acc, [key]: value };
    }
  }, {});
};

export default prompt;
