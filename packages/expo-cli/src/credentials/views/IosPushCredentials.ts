import chalk from 'chalk';
import get from 'lodash/get';

import prompt, { Question } from '../../prompt';
import log from '../../log';
import { Context, IView } from '../context';
import {
  IosAppCredentials,
  IosCredentials,
  IosPushCredentials,
  pushKeySchema,
} from '../credentials';
import { askForUserProvided } from '../actions/promptForCredentials';
import { displayIosUserCredentials } from '../actions/list';
import { PushKey, PushKeyInfo, PushKeyManager } from '../../appleApi';
import { RemoveProvisioningProfile } from './IosProvisioningProfile';
import { CreateAppCredentialsIos } from './IosAppCredentials';

const APPLE_KEYS_TOO_MANY_GENERATED_ERROR = `
You can have only ${chalk.underline('two')} Push Notifactions Keys on your Apple Developer account.
Please revoke the old ones or reuse existing from your other apps.
Please remember that Apple Keys are not application specific!
`;

export class CreateIosPush implements IView {
  async create(ctx: Context): Promise<IosPushCredentials> {
    const newPushKey = await this.provideOrGenerate(ctx);
    return await ctx.ios.createPushKey(newPushKey);
  }

  async open(ctx: Context): Promise<IView | null> {
    const pushKey = await this.create(ctx);

    log('Successfully created Push Notification Key\n');
    displayIosUserCredentials(pushKey);
    log();
    return null;
  }

  async provideOrGenerate(ctx: Context): Promise<PushKey> {
    const userProvided = await askForUserProvided(pushKeySchema);
    if (userProvided) {
      return userProvided;
    }
    return await generatePushKey(ctx);
  }
}

export class RemoveIosPush implements IView {
  shouldRevoke: boolean;

  constructor(shouldRevoke: boolean = false) {
    this.shouldRevoke = shouldRevoke;
  }

  async open(ctx: Context): Promise<IView | null> {
    const selected = await selectPushCredFromList(ctx.ios.credentials);
    if (!selected) {
    } else if (!get(selected, 'type')) {
      await this.removePushCert(ctx, selected as IosAppCredentials);
      log(chalk.green('Successfully removed Push Certificate'));
    } else {
      await this.removeSpecific(ctx, selected as IosPushCredentials);
      log(chalk.green('Successfully removed Push Notification Key'));
    }
    return null;
  }

  async removePushCert(ctx: Context, appCredentials: IosAppCredentials): Promise<void> {
    await ctx.ios.deletePushCert(appCredentials.experienceName, appCredentials.bundleIdentifier);
  }

  async removeSpecific(ctx: Context, selected: IosPushCredentials) {
    const apps = getAppsUsingPushCred(ctx.ios.credentials, selected);
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
    await ctx.ios.deletePushKey(selected.id);

    const { revoke } = await prompt([
      {
        type: 'confirm',
        name: 'revoke',
        message: `Do you also want to revoke it on Apple Developer Portal?`,
        when: !this.shouldRevoke,
      },
    ]);
    if (revoke || this.shouldRevoke) {
      await ctx.ensureAppleCtx();
      await new PushKeyManager(ctx.appleCtx).revoke([selected.apnsKeyId]);
    }
  }
}

export class UpdateIosPush implements IView {
  async open(ctx: Context) {
    const selected = (await selectPushCredFromList(
      ctx.ios.credentials,
      false
    )) as IosPushCredentials;
    if (selected) {
      await this.updateSpecific(ctx, selected);

      log(chalk.green('Successfully updated Push Notification Key.\n'));
      const updated = ctx.ios.credentials.userCredentials.find(i => i.id === selected.id);
      if (updated) {
        displayIosUserCredentials(updated);
      }
      log();
    }
    return null;
  }

  async updateSpecific(ctx: Context, selected: IosPushCredentials) {
    const apps = getAppsUsingPushCred(ctx.ios.credentials, selected);
    const appsList = apps.map(appCred => appCred.experienceName).join(', ');

    if (apps.length > 1) {
      const question: Question = {
        type: 'confirm',
        name: 'confirm',
        message: `Update will affect all applications that are using this key (${appsList}). Do you want to continue?`,
      };
      const { confirm } = await prompt(question);
      if (!confirm) {
        log.warn('Aborting update process');
        return;
      }
    }

    const newPushKey = await this.provideOrGenerate(ctx);
    const credentials = {
      ...newPushKey,
      teamId: ctx.appleCtx.team.id,
      teamName: ctx.appleCtx.team.name,
    };
    await ctx.ios.updatePushKey(selected.id, credentials);
  }

  async provideOrGenerate(ctx: Context): Promise<PushKey> {
    const userProvided = await askForUserProvided(pushKeySchema);
    if (userProvided) {
      return userProvided;
    }
    return await generatePushKey(ctx);
  }
}

export class UseExistingPushNotification implements IView {
  async open(ctx: Context): Promise<IView | null> {
    if (!ctx.hasProjectContext) {
      log.error('Can only be used in project context');
      return null;
    }
    const experience = get(ctx, 'manifest.slug');
    const experienceName = `@${ctx.user.username}/${experience}`;
    const bundleIdentifier = get(ctx, 'manifest.ios.bundleIdentifier');
    if (!experience || !bundleIdentifier) {
      log.error(`slug and ios.bundleIdentifier needs to be defined`);
      return null;
    }

    const filtered = ctx.ios.credentials.appCredentials.filter(
      app => app.experienceName === experienceName && app.bundleIdentifier === bundleIdentifier
    );

    const selected = (await selectPushCredFromList(
      ctx.ios.credentials,
      false
    )) as IosPushCredentials;
    if (selected) {
      await ctx.ios.usePushKey(experienceName, bundleIdentifier, selected.id);
      log(
        chalk.green(
          `Successfully assigned Push Notifactions Key to ${experienceName} (${bundleIdentifier})`
        )
      );
    }
    return null;
  }
}

async function selectPushCredFromList(
  iosCredentials: IosCredentials,
  allowLegacy: boolean = true
): Promise<IosPushCredentials | IosAppCredentials | null> {
  const pushKeys = iosCredentials.userCredentials.filter(
    cred => cred.type === 'push-key'
  ) as IosPushCredentials[];
  const pushCerts = allowLegacy
    ? iosCredentials.appCredentials.filter(
        ({ credentials }) => credentials.pushP12 && credentials.pushPassword
      )
    : [];
  const pushCredentials = [...pushCerts, ...pushKeys];
  if (pushCredentials.length === 0) {
    log.warn('There are no push credentials available in your account');
    return null;
  }

  const getName = (pushCred: IosPushCredentials | IosAppCredentials) => {
    if (get(pushCred, 'type') === 'push-key') {
      return formatPushKey(pushCred as IosPushCredentials, iosCredentials);
    } else {
      const pushCert = pushCred as IosAppCredentials;
      return `Push Certificate (PushId: ${pushCert.credentials.pushId ||
        '------'}, TeamId: ${pushCert.credentials.teamId || '-------'} used in ${
        pushCert.experienceName
      })`;
    }
    return 'unknown credentials';
  };

  const question: Question = {
    type: 'list',
    name: 'credentialsIndex',
    message: 'Select credentials from list',
    choices: pushCredentials.map((entry, index) => ({
      name: getName(entry),
      value: index,
    })),
  };
  const { credentialsIndex } = await prompt(question);
  return pushCredentials[credentialsIndex];
}

function getAppsUsingPushCred(
  iosCredentials: IosCredentials,
  pushCred: IosPushCredentials | IosAppCredentials
): IosAppCredentials[] {
  if (get(pushCred, 'type') === 'push-key') {
    return iosCredentials.appCredentials.filter(
      cred => cred.pushCredentialsId === (pushCred as IosPushCredentials).id
    );
  } else if (get(pushCred, 'credentials.pushP12') && get(pushCred, 'credentials.pushPassword')) {
    return [pushCred as IosAppCredentials];
  }
  return [];
}

function formatPushKeyFromApple(appleInfo: PushKeyInfo, credentials: IosCredentials): string {
  const userCredentials = credentials.userCredentials.filter(
    cred => cred.type == 'push-key' && cred.apnsKeyId === appleInfo.id
  );
  const appCredentials =
    userCredentials.length !== 0
      ? credentials.appCredentials.filter(cred => cred.pushCredentialsId === userCredentials[0].id)
      : [];
  const joinApps = appCredentials
    .map(i => `      ${i.experienceName} (${i.bundleIdentifier})`)
    .join('\n');

  const usedByString = joinApps
    ? `    ${chalk.gray(`used by\n${joinApps}`)}`
    : `    ${chalk.gray(`not used by any apps`)}`;

  const { name, id } = appleInfo;
  const pushKey = userCredentials[0];
  const teamText = pushKey
    ? `, Team ID: ${pushKey.teamId || '---'}, Team name: ${pushKey.teamName || '---'}`
    : '';

  return `${name} - KeyId: ${id}${teamText}\n${usedByString}`;
}

function formatPushKey(pushKey: IosPushCredentials, credentials: IosCredentials): string {
  const appCredentials = credentials.appCredentials.filter(
    cred => cred.pushCredentialsId === pushKey.id
  );
  const joinApps = appCredentials
    .map(i => `${i.experienceName} (${i.bundleIdentifier})`)
    .join(', ');

  const usedByString = joinApps
    ? `\n    ${chalk.gray(`used by ${joinApps}`)}`
    : `\n    ${chalk.gray(`not used by any apps`)}`;

  return `Push Notifications Key (Key ID: ${pushKey.apnsKeyId}, Team ID: ${pushKey.teamId})${usedByString}`;
}

async function generatePushKey(ctx: Context): Promise<PushKey> {
  await ctx.ensureAppleCtx();
  const manager = new PushKeyManager(ctx.appleCtx);
  try {
    return await manager.create();
  } catch (e) {
    if (e.code === 'APPLE_PUSH_KEYS_TOO_MANY_GENERATED_ERROR') {
      const keys = await manager.list();
      log.warn('Maximum number of Push Notifications Keys generated on Apple Developer Portal.');
      log.warn(APPLE_KEYS_TOO_MANY_GENERATED_ERROR);
      const usedByExpo = ctx.ios.credentials.userCredentials
        .filter((cert): cert is IosPushCredentials => cert.type === 'push-key')
        .reduce<{ [key: string]: IosPushCredentials }>(
          (acc, cert) => ({ ...acc, [cert.apnsKeyId]: cert }),
          {}
        );

      const { revoke } = await prompt([
        {
          type: 'checkbox',
          name: 'revoke',
          message: 'Select Push Notifications Key to revoke.',
          choices: keys.map((key, index) => ({
            value: index,
            name: formatPushKeyFromApple(key, ctx.ios.credentials),
          })),
          pageSize: Infinity,
        },
      ]);

      for (const index of revoke) {
        const certInfo = keys[index];
        if (certInfo && usedByExpo[certInfo.id]) {
          await new RemoveIosPush(true).removeSpecific(ctx, usedByExpo[certInfo.id]);
        } else {
          await manager.revoke([certInfo.id]);
        }
      }
    } else {
      throw e;
    }
  }
  return await generatePushKey(ctx);
}
