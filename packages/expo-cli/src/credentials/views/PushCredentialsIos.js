/* @flow */

import chalk from 'chalk';

import { View } from './View';
import { Context, credentialTypes, PUSH_KEY } from '../schema';
import type { IosCredentials, IosPushCredentials, IosAppCredentials } from '../schema';
import { askForUserProvided } from '../actions/promptForCredentials';
import { displayIosUserCredentials } from '../actions/list';
import prompt from '../../prompt';
import log from '../../log';
import { pushKeyManager } from '../../appleApi';

type PushKey = {
  apnsKeyId: string,
  apnsKeyP8: string,
};

const APPLE_KEYS_ONE_ALREADY_GENERATED_WARNING = `
You can have only ${chalk.underline('two')} Push Notifactions Keys on your Apple Developer account.
It's recomeneded to use only one key for all of your apps, second key should be used only when an old one is about to expire and you want to replace it without any downtime.
`;

const APPLE_KEYS_TOO_MANY_GENERATED_ERROR = `
You can have only ${chalk.underline('two')} Push Notifactions Keys on your Apple Developer account.
Please revoke the old ones or reuse existing from your other apps.
Please remember that Apple Keys are not application specific!
`;

export class CreateIosPush extends View {
  iosCredentials: IosCredentials;

  constructor(iosCredentials: IosCredentials) {
    super();
    this.iosCredentials = iosCredentials;
  }

  async create(context: Context): Promise<number> {
    const newPushKey = await this.provideOrGenerate(context);
    const { id } = await context.apiClient.putAsync(`credentials/ios/user`, {
      ...newPushKey,
      type: 'push-key',
      teamId: context.appleCtx.team.id,
      teamName: context.appleCtx.team.name,
    });
    return id;
  }

  async open(context: Context): Promise<?View> {
    const id = await this.create(context);

    log('Created Push Notification Key succesfully\n');
    const { userCredentials } = await context.apiClient.getAsync(`credentials/ios/user/${id}`);
    displayIosUserCredentials(userCredentials);
    log();
  }

  async provideOrGenerate(context: Context): Promise<PushKey> {
    const userProvided = await askForUserProvided(context, credentialTypes[PUSH_KEY]);
    if (userProvided) {
      return userProvided;
    }
    await context.ensureAppleCtx();
    const manager = pushKeyManager(context.appleCtx);
    const keys = await manager.list();

    if (keys.length >= 2) {
      log.error(APPLE_KEYS_TOO_MANY_GENERATED_ERROR);
    } else if (keys.length === 1) {
      log.warn(APPLE_KEYS_ONE_ALREADY_GENERATED_WARNING);
    }

    if (keys.length !== 0) {
      const { revoke } = await prompt([
        {
          type: 'list',
          name: 'revoke',
          message:
            'Do you want to revoke existing Push Notifictions Key from Apple Developer Portal?',
          choices: [
            { value: 'norevoke', name: "Don't revoke any keys." },
            ...keys.map((key, index) => ({ value: index, name: manager.format(key) })),
          ],
          pageSize: Infinity,
        },
      ]);

      if (revoke !== 'norevoke') {
        const usedByExpo = this.iosCredentials.userCredentials.filter(
          key => key.type === 'push-key' && key.apnsKeyId === keys[revoke].id
        );
        if (usedByExpo.length >= 1) {
          await new RemoveIosPush(this.iosCredentials, true).removeSpecific(context, usedByExpo[0]);
        } else {
          await manager.revoke([keys[revoke].id]);
        }
      }
    }
    return await manager.create();
  }
}

export class RemoveIosPush extends View {
  iosCredentials: IosCredentials;
  shouldRevoke: boolean;

  constructor(iosCredentials: IosCredentials, shouldRevoke: boolean = false) {
    super();
    this.iosCredentials = iosCredentials;
    this.shouldRevoke = shouldRevoke;
  }

  async open(context: Context): Promise<?View> {
    const selected = await selectPushCredFromList(this.iosCredentials);
    if (!selected) {
    } else if (!selected.type) {
      await this.removePushCert(context, selected);
    } else {
      return await this.removeSpecific(context, selected);
    }
  }

  async removePushCert(context: Context, appCredentials: IosAppCredentials) {
    await context.apiClient.deleteAsync(
      `credentials/ios/app/push/${appCredentials.appCredentialsId}`
    );
  }

  async removeSpecific(context: Context, selected: IosPushCredentials) {
    const apps = getAppsUsingPushCred(this.iosCredentials, selected);
    const appsList = apps.map(appCred => appCred.experienceName).join(', ');

    if (appsList) {
      const { confirm } = await prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Removing this key/cert will disable notifications in ${appsList}. Do you want to continue?`,
        },
      ]);
      if (!confirm) {
        log('Aborting');
        return;
      }
    }
    await context.apiClient.deleteAsync(`credentials/ios/user/${selected.userCredentialsId}`);
    this.iosCredentials.userCredentials = this.iosCredentials.userCredentials.filter(
      key => key.userCredentialsId !== selected.userCredentialsId
    );

    const { revoke } = await prompt([
      {
        type: 'confirm',
        name: 'revoke',
        message: `Do you want also to revoke it on Apple Developer Portal?`,
        when: !this.shouldRevoke,
      },
    ]);
    if (revoke || this.shouldRevoke) {
      await context.ensureAppleCtx();
      await pushKeyManager(context.appleCtx).revoke([selected.apnsKeyId]);
    }
  }
}

export class UpdateIosPush extends View {
  iosCredentials: IosCredentials;

  constructor(iosCredentials: IosCredentials) {
    super();
    this.iosCredentials = iosCredentials;
  }

  async open(context: Context) {
    const selected = await selectPushCredFromList(this.iosCredentials);
    if (!selected) {
    } else if (!selected.type) {
      await this.updatePushCert(context, selected);
    } else {
      return await this.updateSpecific(context, selected);
    }
  }

  async updatePushCert(context: Context, appCredentials: IosAppCredentials) {
    await context.apiClient.deleteAsync(
      `credentials/ios/app/push/${appCredentials.appCredentialsId}`
    );
    const id = await new CreateIosPush(this.iosCredentials).create(context);
    await context.apiClient.postAsync(`credentials/ios/use/user`, {
      userCredentialsId: id,
      appCredentialsId: appCredentials.appCredentialsId,
    });

    log('Updated Push Notification Key succesfully\n');
    const { userCredentials } = await context.apiClient.getAsync(`credentials/ios/user/${id}`);
    displayIosUserCredentials(userCredentials);
    log();
  }

  async updateSpecific(context: Context, selected: IosPushCredentials): Promise<?View> {
    const apps = getAppsUsingPushCred(this.iosCredentials, selected);
    const appsList = apps.map(appCred => appCred.experienceName).join(', ');

    if (apps.length > 1) {
      const question = {
        type: 'confirm',
        name: 'confirm',
        message: `Update will affect all applications that are using this key (${appsList}). Do you want to continue?`,
      };
      const { confirm } = await prompt([question]);
      if (!confirm) {
        log('Aborting update process');
        return;
      }
    }

    const newPushKey = await this.provideOrGenerate(context, selected.apnsKeyId);
    await context.ensureAppleCtx();
    await context.apiClient.postAsync(`credentials/ios/user/${selected.userCredentialsId}`, {
      ...newPushKey,
      teamId: context.appleCtx.team.id,
      teamName: context.appleCtx.team.name,
      type: 'push-key',
    });

    log('Updated Push Notification Key succesfully\n');
    const { userCredentials } = await context.apiClient.getAsync(
      `credentials/ios/user/${selected.userCredentialsId}`
    );
    displayIosUserCredentials(userCredentials);
    log();
  }

  async provideOrGenerate(context: Context, removedKeyId: string): Promise<PushKey> {
    const userProvided = await askForUserProvided(context, credentialTypes[PUSH_KEY]);
    if (userProvided) {
      return userProvided;
    }
    await context.ensureAppleCtx();
    const manager = pushKeyManager(context.appleCtx);
    const keys = await manager.list();
    if (keys.length >= 2) {
      log.error(APPLE_KEYS_TOO_MANY_GENERATED_ERROR);
    }

    if (keys.length !== 0) {
      const { revoke } = await prompt([
        {
          type: 'list',
          name: 'revoke',
          message:
            'Do you want to revoke existing Push Notifictions Key from your Apple Developer Portal?',
          choices: [
            { value: 'norevoke', name: "Don't revoke any keys." },
            ...keys.map((key, index) => ({ value: index, name: manager.format(key) })),
          ],
          pageSize: Infinity,
        },
      ]);

      if (revoke !== 'norevoke') {
        const usedByExpo = this.iosCredentials.userCredentials.filter(
          key =>
            key.type === 'push-key' &&
            key.apnsKeyId === keys[revoke].id &&
            key.apnsKeyId !== removedKeyId
        );
        if (usedByExpo.length >= 1) {
          await new RemoveIosPush(this.iosCredentials, true).removeSpecific(context, usedByExpo[0]);
        } else {
          await manager.revoke([keys[revoke].id]);
        }
      }
    }
    return await manager.create();
  }
}

async function selectPushCredFromList(iosCredentials: IosCredentials) {
  const pushKeys = iosCredentials.userCredentials.filter(cred => cred.type === 'push-key');
  const pushCerts = iosCredentials.appCredentials.filter(cred => cred.pushP12 && cred.pushPassword);
  const pushCredentials = [...pushCerts, ...pushKeys];
  if (pushCredentials.length === 0) {
    log.warn('There are no push credentials available in your account');
    return null;
  }

  const getName = pushCred => {
    if (!pushCred.type) {
      return `Push Certificate (pushId: ${pushCred.pushId || '------'}, teamId: ${pushCred.teamId ||
        '-------'} used in ${pushCred.experienceName})`;
    }
    if (pushCred.type === 'push-key') {
      const apps = getAppsUsingPushCred(iosCredentials, pushCred).map(cred => cred.experienceName);
      const usedText = apps.length > 0 ? `used in ${apps.join(', ')}` : 'not used in any apps';
      return `Push Notifications Key (keyId: ${pushCred.apnsKeyId}, teamId: ${pushCred.teamId ||
        '-----'}) ${usedText}`;
    }
    return 'unkown credentials';
  };

  const question = {
    type: 'list',
    name: 'credentialsIndex',
    message: 'Select credentials from list',
    choices: pushCredentials.map((entry, index) => ({
      name: getName(entry),
      value: index,
    })),
  };
  const { credentialsIndex } = await prompt([question]);
  return pushCredentials[credentialsIndex];
}

function getAppsUsingPushCred(iosCredentials, pushCred) {
  if (pushCred.type === 'push-cert') {
    return [pushCred];
  }
  return iosCredentials.appCredentials.filter(
    cred => pushCred.type === 'push-key' && cred.pushCredentialsId === pushCred.userCredentialsId
  );
}
