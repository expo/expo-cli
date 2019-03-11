import { Credentials } from 'xdl';

import * as appleApi from '../build/ios/appleApi';
import * as credentials from '../build/ios/credentials';
import promptForCredentials from '../build/ios/credentials/prompt/promptForCredentials';
import log from '../../log';
import prompt from '../../prompt';

export default async function selectPushKey(context, options = {}) {
  let manager = appleApi.createManagers(context).pushKey;
  let pushKeys = await Credentials.Ios.getExistingPushKeys(context.username, context.team.id);
  let choices = [{ name: '[Upload an existing key]', value: 'UPLOAD' }, ...pushKeys];
  if (!options.disableCreate) {
    choices.unshift({ name: '[Create a new key]', value: 'GENERATE' });
  }
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
  let manager = appleApi.createManagers(context).pushKey;
  try {
    return await manager.create({});
  } catch (e) {
    if (e.code === 'APPLE_KEYS_TOO_MANY_GENERATED_ERROR') {
      let keys = await manager.list();
      log(`Maximum number (${keys.length}) of keys generated.`);
      let { answer } = await prompt({
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
        return await selectPushKey(context, { disableCreate: true });
      }
    }
  }
}
