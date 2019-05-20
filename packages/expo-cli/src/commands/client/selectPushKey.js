import ora from 'ora';
import { Credentials } from '@expo/xdl';

import * as appleApi from '../build/ios/appleApi';
import * as credentials from '../build/ios/credentials';
import promptForCredentials from '../build/ios/credentials/prompt/promptForCredentials';
import log from '../../log';
import prompt from '../../prompt';
import { tagForUpdate } from './tagger';

import { choosePreferredCreds } from './selectUtils';

// XXX: workaround for https://github.com/babel/babel/issues/6262
export default selectPushKey;

async function selectPushKey(context, options = {}) {
  const pushKeys = context.username ? await chooseUnrevokedPushKey(context) : [];
  const choices = [...pushKeys];

  // autoselect creds if we find valid ones
  if (pushKeys.length > 0 && !options.disableAutoSelectExisting) {
    const autoselectedPushkey = choosePreferredCreds(context, pushKeys);
    log(`Using Push Key: ${autoselectedPushkey.name}`);
    return autoselectedPushkey.value;
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
    const isValid = await validateUploadedPushKey(context, pushKey);
    if (!isValid) {
      return await selectPushKey(context, { disableAutoSelectExisting: true });
    }

    // tag for updating to Expo servers
    tagForUpdate(pushKey);
  }
  return pushKey;
}

async function validateUploadedPushKey(context, pushKey) {
  const spinner = ora(`Checking validity of push key on Apple Developer Portal...`).start();

  const formattedPushKeyArray = Credentials.Ios.formatPushKeys([pushKey], {
    provideFullPushKey: true,
  });
  const filteredFormattedPushKeyArray = await filterRevokedPushKeys(context, formattedPushKeyArray);
  const isValidPushKey = filteredFormattedPushKeyArray.length > 0;
  if (isValidPushKey) {
    const successMsg = `Successfully validated the Push Key you uploaded against Apple Servers`;
    spinner.succeed(successMsg);
  } else {
    const failureMsg = `The Push Key you uploaded is not valid. Please check that it was not revoked on the Apple Servers. See docs.expo.io/versions/latest/guides/adhoc-builds for more details on uploading your credentials.`;
    spinner.fail(failureMsg);
  }
  return isValidPushKey;
}

async function chooseUnrevokedPushKey(context) {
  const pushKeysOnExpoServer = await Credentials.Ios.getExistingPushKeys(
    context.username,
    context.team.id,
    {
      provideFullPushKey: true,
    }
  );

  if (pushKeysOnExpoServer.length === 0) {
    return []; // no keys stored on server
  }

  const spinner = ora(`Checking validity of push keys on Apple Developer Portal...`).start();
  const validPushKeysOnExpoServer = await filterRevokedPushKeys(context, pushKeysOnExpoServer);

  const numValidKeys = validPushKeysOnExpoServer.length;
  const numRevokedKeys = pushKeysOnExpoServer.length - validPushKeysOnExpoServer.length;
  const statusToDisplay = `Push Keys: You have ${numValidKeys} valid and ${numRevokedKeys} revoked push keys on the Expo servers.`;
  if (numValidKeys > 0) {
    spinner.succeed(statusToDisplay);
  } else {
    spinner.warn(statusToDisplay);
  }

  return validPushKeysOnExpoServer;
}

async function filterRevokedPushKeys(context, pushKeys) {
  // if the credentials are valid, check it against apple to make sure it hasnt been revoked
  const pushKeyManager = appleApi.createManagers(context).pushKey;
  const pushKeysOnAppleServer = await pushKeyManager.list();
  const validKeyIdsOnAppleServer = pushKeysOnAppleServer.map(pushKey => pushKey.id);
  const validPushKeysOnExpoServer = pushKeys.filter(pushKey => {
    const apnsKeyId = pushKey.value && pushKey.value.apnsKeyId;
    return validKeyIdsOnAppleServer.includes(apnsKeyId);
  });
  return validPushKeysOnExpoServer;
}

async function generatePushKey(context) {
  const manager = appleApi.createManagers(context).pushKey;
  try {
    const pushKey = await manager.create({});

    // tag for updating to Expo servers
    tagForUpdate(pushKey);

    return pushKey;
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
