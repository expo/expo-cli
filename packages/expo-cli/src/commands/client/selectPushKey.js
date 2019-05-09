import { Credentials } from 'xdl';

import * as appleApi from '../build/ios/appleApi';
import * as credentials from '../build/ios/credentials';
import promptForCredentials from '../build/ios/credentials/prompt/promptForCredentials';
import log from '../../log';
import prompt from '../../prompt';

import { choosePreferredCreds } from './selectUtils';

// XXX: workaround for https://github.com/babel/babel/issues/6262
export default selectPushKey;

async function selectPushKey(context, options = {}) {
  const pushKeys = context.username
    ? await Credentials.Ios.getExistingPushKeys(context.username, context.team.id)
    : [];
  const choices = [...pushKeys];

  // autoselect creds if we find valid ones
  if (pushKeys.length > 0 && !options.disableAutoSelectExisting) {
    const autoselectedPushkey = choosePreferredCreds(context, pushKeys);
    log(`Using Push Key: ${autoselectedPushkey.name}`);
    return autoselectedPushkey;
  }

  if (!options.disableCreate) {
    choices.push({ name: '[Create a new key]', value: 'GENERATE' });
  }
  choices.push({ name: '[Upload an existing key]', value: 'UPLOAD' });

  let { pushKey } = await prompt({
    type: 'list',
    name: 'pushKey',
    message: 'Select an authentication token signing key to use for push notifications:',
    pageSize: Infinity,
    choices,
  });
  if (pushKey === 'GENERATE') {
    pushKey = await generatePushKey(context);
  } else if (pushKey === 'UPLOAD') {
    pushKey = (await promptForCredentials(context, ['pushKey']))[0].pushKey;
  }
  return pushKey;
}

async function generatePushKey(context) {
  const manager = appleApi.createManagers(context).pushKey;
  try {
    return await manager.create({});
  } catch (e) {
    if (e.code === 'APPLE_KEYS_TOO_MANY_GENERATED_ERROR') {
      const keys = await manager.list();
      log.warn(`Maximum number (${keys.length}) of keys generated.`);
      const { answer } = await prompt({
        type: 'list',
        name: 'answer',
        message: 'Please revoke or reuse an existing key:',
        choices: [
          {
            key: 'r',
            name: 'Choose which keys to revoke',
            value: 'REVOKE',
          },
          {
            key: 'e',
            name: 'Use an existing key',
            value: 'USE_EXISTING',
          },
        ],
      });
      if (answer === 'REVOKE') {
        await credentials.revoke(context, ['pushKey']);
        return await generatePushKey(context);
      } else if (answer === 'USE_EXISTING') {
        return await selectPushKey(context, {
          disableCreate: true,
          disableAutoSelectExisting: true,
        });
      }
    }
  }
}
