import chalk from 'chalk';
import get from 'lodash/get';
import ora from 'ora';

import inquirer from 'inquirer';
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
import { AppleCtx, PushKey, PushKeyInfo, PushKeyManager } from '../../appleApi';
import { RemoveProvisioningProfile } from './IosProvisioningProfile';
import { CreateAppCredentialsIos } from './IosAppCredentials';
import { CredentialsManager, GoBackError } from '../route';

const APPLE_KEYS_TOO_MANY_GENERATED_ERROR = `
You can have only ${chalk.underline('two')} Push Notifactions Keys on your Apple Developer account.
Please revoke the old ones or reuse existing from your other apps.
Please remember that Apple Keys are not application specific!
`;

export type PushKeyOptions = {
  experienceName: string;
  bundleIdentifier: string;
};

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
      const isValid = await validatePushKey(ctx, userProvided);
      return isValid ? userProvided : await this.provideOrGenerate(ctx);
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
    const selected = await selectPushCredFromList(ctx);
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
    const selected = (await selectPushCredFromList(ctx, {
      allowLegacy: false,
    })) as IosPushCredentials;
    if (selected) {
      await this.updateSpecific(ctx, selected);

      log(chalk.green('Successfully updated Push Notification Key.\n'));
      const updated = ctx.ios.credentials.userCredentials.find(i => i.id === selected.id);
      if (updated) {
        displayIosUserCredentials(updated);
      }
      log();
      return null;
    }
    throw new GoBackError();
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
      const isValid = await validatePushKey(ctx, userProvided);
      return isValid ? userProvided : await this.provideOrGenerate(ctx);
    }
    return await generatePushKey(ctx);
  }
}

export class UseExistingPushNotification implements IView {
  _experienceName: string;
  _bundleIdentifier: string;

  constructor(options: PushKeyOptions) {
    const { experienceName, bundleIdentifier } = options;
    this._experienceName = experienceName;
    this._bundleIdentifier = bundleIdentifier;
  }

  static withProjectContext(ctx: Context): UseExistingPushNotification | null {
    if (!ctx.hasProjectContext) {
      log.error('Can only be used in project context');
      return null;
    }
    const options = getOptionsFromProjectContext(ctx);
    if (!options) return null;
    return new UseExistingPushNotification(options);
  }

  async open(ctx: Context): Promise<IView | null> {
    const selected = (await selectPushCredFromList(ctx, {
      allowLegacy: false,
    })) as IosPushCredentials;
    if (selected) {
      await ctx.ios.usePushKey(this._experienceName, this._bundleIdentifier, selected.id);
      log(
        chalk.green(
          `Successfully assigned Push Notifactions Key to ${this._experienceName} (${this._bundleIdentifier})`
        )
      );
    }
    return null;
  }
}

export class CreateOrReusePushKey implements IView {
  _experienceName: string;
  _bundleIdentifier: string;
  _credentialsManager: CredentialsManager;

  constructor(options: PushKeyOptions) {
    const { experienceName, bundleIdentifier } = options;
    this._experienceName = experienceName;
    this._bundleIdentifier = bundleIdentifier;
    this._credentialsManager = CredentialsManager.get();
  }

  async assignPushKey(ctx: Context, userCredentialsId: number) {
    await ctx.ios.usePushKey(this._experienceName, this._bundleIdentifier, userCredentialsId);
    log(
      chalk.green(
        `Successfully assigned Push Key to ${this._experienceName} (${this._bundleIdentifier})`
      )
    );
  }

  async open(ctx: Context): Promise<IView | null> {
    if (!ctx.user) {
      throw new Error(`This workflow requires you to be logged in.`);
    }

    const existingPushKeys = await getValidPushKeys(ctx.ios.credentials, ctx);

    if (existingPushKeys.length === 0) {
      const createOperation = async () => new CreateIosPush().create(ctx);
      const pushKey = await this._credentialsManager.doInteractiveOperation(createOperation, this);
      await this.assignPushKey(ctx, pushKey.id);
      return null;
    }

    // autoselect creds if we find valid keys
    const autoselectedPushKey = existingPushKeys[0];
    const confirmQuestion: Question = {
      type: 'confirm',
      name: 'confirm',
      message: `${formatPushKey(
        autoselectedPushKey,
        ctx.ios.credentials,
        'VALID'
      )} \n Would you like to use this Push Key?`,
      pageSize: Infinity,
    };

    const { confirm } = await prompt(confirmQuestion);
    if (confirm) {
      log(`Using Push Key: ${autoselectedPushKey.apnsKeyId}`);
      await this.assignPushKey(ctx, autoselectedPushKey.id);
      return null;
    }

    const choices = [
      {
        name: '[Choose existing push key] (Recommended)',
        value: 'CHOOSE_EXISTING',
      },
      { name: '[Add a new push key]', value: 'GENERATE' },
      { name: '[Go back]', value: 'GO_BACK' },
    ];

    const question: Question = {
      type: 'list',
      name: 'action',
      message: 'Select an iOS push key to use for push notifications:',
      choices,
      pageSize: Infinity,
    };

    const { action } = await prompt(question);

    if (action === 'GENERATE') {
      const createOperation = async () => new CreateIosPush().create(ctx);
      const pushKey = await this._credentialsManager.doInteractiveOperation(createOperation, this);
      await this.assignPushKey(ctx, pushKey.id);
      return null;
    } else if (action === 'CHOOSE_EXISTING') {
      return new UseExistingPushNotification({
        bundleIdentifier: this._bundleIdentifier,
        experienceName: this._experienceName,
      });
    } else {
      throw new GoBackError(); // go back
    }
  }
}

async function getValidPushKeys(iosCredentials: IosCredentials, ctx: Context) {
  const pushKeys = iosCredentials.userCredentials.filter(
    (cred): cred is IosPushCredentials => cred.type === 'push-key'
  );
  if (!ctx.hasAppleCtx()) {
    log(
      chalk.yellow(
        `Unable to determine validity of Push Keys due to insufficient Apple Credentials`
      )
    );
    return pushKeys;
  }
  const pushKeyManager = new PushKeyManager(ctx.appleCtx);
  const pushInfoFromApple = await pushKeyManager.list();
  return await filterRevokedPushKeys<IosPushCredentials>(pushInfoFromApple, pushKeys);
}

function getValidityStatus(
  pushKey: IosPushCredentials,
  validPushKeys: IosPushCredentials[] | null
): ValidityStatus {
  if (!validPushKeys) {
    return 'UNKNOWN';
  }
  return validPushKeys.includes(pushKey) ? 'VALID' : 'INVALID';
}

function getOptionsFromProjectContext(ctx: Context): PushKeyOptions | null {
  const experience = get(ctx, 'manifest.slug');
  const owner = get(ctx, 'manifest.owner');
  const experienceName = `@${owner || ctx.user.username}/${experience}`;
  const bundleIdentifier = get(ctx, 'manifest.ios.bundleIdentifier');
  if (!experience || !bundleIdentifier) {
    log.error(`slug and ios.bundleIdentifier needs to be defined`);
    return null;
  }

  return { experienceName, bundleIdentifier };
}

type ListOptions = {
  filterInvalid?: boolean;
  allowLegacy?: boolean;
};

async function selectPushCredFromList(
  ctx: Context,
  options: ListOptions = {}
): Promise<IosPushCredentials | IosAppCredentials | null> {
  const iosCredentials = ctx.ios.credentials;
  const allowLegacy = options.allowLegacy || true;
  let pushKeys = iosCredentials.userCredentials.filter(
    cred => cred.type === 'push-key'
  ) as IosPushCredentials[];
  let validPushKeys: IosPushCredentials[] | null = null;
  if (ctx.hasAppleCtx()) {
    const pushKeyManager = new PushKeyManager(ctx.appleCtx);
    const pushInfoFromApple = await pushKeyManager.list();
    validPushKeys = await filterRevokedPushKeys<IosPushCredentials>(pushInfoFromApple, pushKeys);
  }
  pushKeys = options.filterInvalid && validPushKeys ? validPushKeys : pushKeys;

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
      return formatPushKey(
        pushCred as IosPushCredentials,
        iosCredentials,
        getValidityStatus(pushCred as IosPushCredentials, validPushKeys)
      );
    } else {
      const pushCert = pushCred as IosAppCredentials;
      return `Push Certificate (PushId: ${pushCert.credentials.pushId ||
        '------'}, TeamId: ${pushCert.credentials.teamId || '-------'} used in ${
        pushCert.experienceName
      })`;
    }
    return 'unknown credentials';
  };

  const NONE_SELECTED = -1;
  const choices = pushCredentials.map((entry, index) => ({
    name: getName(entry),
    value: index,
  }));
  choices.push({
    name: '[Go back]',
    value: NONE_SELECTED,
  });

  const question: Question = {
    type: 'list',
    name: 'credentialsIndex',
    message: 'Select credentials from list',
    choices,
  };
  const { credentialsIndex } = await prompt(question);
  if (credentialsIndex === NONE_SELECTED) {
    return null;
  }
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

type ValidityStatus = 'UNKNOWN' | 'VALID' | 'INVALID';
function formatPushKey(
  pushKey: IosPushCredentials,
  credentials: IosCredentials,
  validityStatus: ValidityStatus = 'UNKNOWN'
): string {
  const appCredentials = credentials.appCredentials.filter(
    cred => cred.pushCredentialsId === pushKey.id
  );
  const joinApps = appCredentials
    .map(i => `${i.experienceName} (${i.bundleIdentifier})`)
    .join(', ');

  const usedByString = joinApps
    ? `\n    ${chalk.gray(`used by ${joinApps}`)}`
    : `\n    ${chalk.gray(`not used by any apps`)}`;

  let validityText;
  if (validityStatus === 'VALID') {
    validityText = chalk.gray("\n    ✅ Currently valid on Apple's servers.");
  } else if (validityStatus === 'INVALID') {
    validityText = chalk.gray("\n    ❌ No longer valid on Apple's servers.");
  } else {
    validityText = chalk.gray(
      "\n    ❓ Validity of this certificate on Apple's servers is unknown."
    );
  }
  return `Push Notifications Key (Key ID: ${pushKey.apnsKeyId}, Team ID: ${pushKey.teamId})${usedByString}${validityText}`;
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

      const ui = new inquirer.ui.BottomBar();
      ui.log.write('ℹ️ ℹ️ ℹ️ Show me more info about these choices ℹ️ ℹ️ ℹ️');
      ui.log.write(
        'ℹ️ ℹ️ ℹ️ https://docs.expo.io/versions/latest/distribution/app-signing/#summary ℹ️ ℹ️ ℹ️'
      );
      ui.log.write('\n');

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

export async function validatePushKey(ctx: Context, pushKey: PushKey) {
  if (!ctx.hasAppleCtx()) {
    log.warn('Unable to validate Push Keys due to insufficient Apple Credentials');
    return true;
  }
  const spinner = ora(`Checking validity of push key on Apple Developer Portal...`).start();

  const pushKeyManager = new PushKeyManager(ctx.appleCtx);
  const pushInfoFromApple = await pushKeyManager.list();
  const filteredFormattedPushKeyArray = await filterRevokedPushKeys(pushInfoFromApple, [pushKey]);
  const isValidPushKey = filteredFormattedPushKeyArray.length > 0;
  if (isValidPushKey) {
    const successMsg = `Successfully validated Push Key against Apple Servers`;
    spinner.succeed(successMsg);
  } else {
    const failureMsg = `This Push Key is no longer valid on the Apple Developer Portal`;
    spinner.fail(failureMsg);
  }
  return isValidPushKey;
}

async function filterRevokedPushKeys<T extends PushKey>(
  pushInfoFromApple: PushKeyInfo[],
  pushKeys: T[]
): Promise<T[]> {
  // if the credentials are valid, check it against apple to make sure it hasnt been revoked
  const validKeyIdsOnAppleServer = pushInfoFromApple.map(pushKey => pushKey.id);
  const validPushKeysOnExpoServer = pushKeys.filter(pushKey => {
    return validKeyIdsOnAppleServer.includes(pushKey.apnsKeyId);
  });
  return validPushKeysOnExpoServer;
}
