import { Credentials } from '@expo/xdl';
import open from 'open';
import ora from 'ora';

import log from '../../log';
import prompt from '../../prompt';
import * as appleApi from '../build/ios/appleApi';
import * as credentials from '../build/ios/credentials';
import promptForCredentials from '../build/ios/credentials/prompt/promptForCredentials';
import { choosePreferredCreds } from './selectUtils';
import { tagForUpdate } from './tagger';

export default async function selectPushKey(context, options = {}) {
  const pushKeys = context.username ? await chooseUnrevokedPushKey(context) : [];
  const choices = [...pushKeys];

  // autoselect creds if we find valid ones
  if (pushKeys.length > 0 && !options.disableAutoSelectExisting) {
    const autoselectedPushkey = choosePreferredCreds(context, pushKeys);
    log(`Using Push Key: ${autoselectedPushkey.name}`);
    return autoselectedPushkey.value;
  }

  if (!options.disableCreate) {
    choices.push({ name: '[Create a new key] (Recommended)', value: 'GENERATE' });
  }
  choices.push({ name: '[Upload an existing key]', value: 'UPLOAD' });
  choices.push({ name: '[Skip. This will disable push notifications.]', value: 'SKIP' });
  choices.push({ name: '[Show me more info about these choices] ℹ️', value: 'INFO' });

  let { promptValue } = await prompt({
    type: 'list',
    name: 'promptValue',
    message: 'Select an authentication token signing key to use for push notifications:',
    pageSize: Infinity,
    choices,
  });
  if (promptValue === 'GENERATE') {
    return await generatePushKey(context);
  } else if (promptValue === 'UPLOAD') {
    const pushKey = (await promptForCredentials(context, ['pushKey'])).credentials.pushKey;
    const isValid = await validateUploadedPushKey(context, pushKey);
    if (!isValid) {
      return await selectPushKey(context, { disableAutoSelectExisting: true });
    }

    // tag for updating to Expo servers
    tagForUpdate(pushKey);
  } else if (promptValue === 'INFO') {
    open('https://docs.expo.io/versions/latest/guides/adhoc-builds/#push-key-cli-options');
    return await selectPushKey(context);
  } else if (promptValue === 'SKIP') {
    return null;
  } else {
    return promptValue; // this should be an unrevoked key from the Expo servers
  }
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
          {
            key: 's',
            name: '[Skip. This will disable push notifications.]',
            value: 'SKIP',
          },
          { name: '[Show me more info about these choices] ℹ️', value: 'INFO' },
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
      } else if (answer === 'SKIP') {
        return null;
      } else if (answer === 'INFO') {
        open('https://docs.expo.io/versions/latest/guides/adhoc-builds/#push-key-cli-options');
        return await generatePushKey(context);
      }
    }
    throw new Error(e);
  }
}
