import chalk from 'chalk';
import fs from 'fs-extra';
import terminalLink from 'terminal-link';

import CommandError from '../../CommandError';
import { isPushKey, PushKey, PushKeyInfo, PushKeyManager } from '../../appleApi';
import Log from '../../log';
import prompt, { confirmAsync, Question } from '../../prompts';
import { ora } from '../../utils/ora';
import { displayIosUserCredentials } from '../actions/list';
import { askForUserProvided, CredentialSchema } from '../actions/promptForCredentials';
import { AppLookupParams, getAppLookupParams } from '../api/IosApi';
import { Context, IView } from '../context';
import {
  IosAppCredentials,
  IosCredentials,
  IosPushCredentials,
  pushKeySchema,
} from '../credentials';

const APPLE_KEYS_TOO_MANY_GENERATED_ERROR = `
You can have only ${chalk.underline('two')} Push Notifactions Keys on your Apple Developer account.
Please revoke the old ones or reuse existing from your other apps.
Please remember that Apple Keys are not application specific!
`;

export class CreateIosPush implements IView {
  constructor(private accountName: string) {}

  async create(ctx: Context): Promise<IosPushCredentials> {
    const newPushKey = await this.provideOrGenerate(ctx);
    return await ctx.ios.createPushKey(this.accountName, newPushKey);
  }

  async open(ctx: Context): Promise<IView | null> {
    const pushKey = await this.create(ctx);

    Log.log('Successfully created Push Notification Key\n');
    displayIosUserCredentials(pushKey);
    Log.log();

    return null;
  }

  _getRequiredQuestions(ctx: Context): CredentialSchema<PushKey> {
    const requiredQuestions = { ...pushKeySchema };
    if (ctx.hasAppleCtx() && requiredQuestions.questions) {
      requiredQuestions.required = requiredQuestions.required.filter(q => q !== 'teamId');
    }
    return requiredQuestions;
  }

  _ensurePushKey(ctx: Context, partialKey: Partial<PushKey>): PushKey {
    if (ctx.hasAppleCtx()) {
      partialKey.teamId = ctx.appleCtx.team.id;
      partialKey.teamName = ctx.appleCtx.team.name;
    }
    if (!isPushKey(partialKey)) {
      throw new Error(`Not of type PushKey: ${partialKey}`);
    }
    return partialKey;
  }

  async provideOrGenerate(ctx: Context): Promise<PushKey> {
    if (!ctx.nonInteractive) {
      const requiredQuestions = this._getRequiredQuestions(ctx);
      const userProvided = await askForUserProvided(requiredQuestions);
      if (userProvided) {
        const pushKey = this._ensurePushKey(ctx, userProvided);
        const isValid = await validatePushKey(ctx, pushKey);
        return isValid ? userProvided : await this.provideOrGenerate(ctx);
      }
    }
    return await generatePushKey(ctx, this.accountName);
  }
}

export class CreateAndAssignIosPush extends CreateIosPush {
  async open(ctx: Context): Promise<IView | null> {
    const pushKey = await super.create(ctx);

    Log.log('Successfully created Push Notification Key\n');
    displayIosUserCredentials(pushKey);
    Log.log();

    if (ctx.hasProjectContext && pushKey) {
      await this.assignToCurrentProject(ctx, pushKey.id);
      Log.log();
    }

    return null;
  }

  async assignToCurrentProject(ctx: Context, pushKeyId: number) {
    const experienceName = `@${ctx.projectOwner}/${ctx.manifest.slug}`;
    const bundleIdentifier = ctx.manifest?.ios?.bundleIdentifier;
    if (!ctx.nonInteractive && bundleIdentifier) {
      const confirm = await confirmAsync({
        message: `Would you like to use this push key for the current project: ${experienceName} (${bundleIdentifier})?`,
      });
      if (!confirm) {
        return;
      }

      const app = getAppLookupParams(experienceName, bundleIdentifier);
      await ctx.ios.usePushKey(app, pushKeyId);
      Log.log(
        chalk.green(`Successfully assigned Push Key to ${experienceName} (${bundleIdentifier})`)
      );
    }
  }
}

export class RemoveIosPush implements IView {
  constructor(private accountName: string, private shouldRevoke: boolean = false) {}

  async open(ctx: Context): Promise<IView | null> {
    if (ctx.nonInteractive) {
      throw new CommandError(
        'NON_INTERACTIVE',
        "Start the CLI without the '--non-interactive' flag to select a push notification credential to remove."
      );
    }

    const selected = await selectPushCredFromList(ctx, this.accountName);
    if (selected) {
      if (!('type' in selected)) {
        const app = getAppLookupParams(selected.experienceName, selected.bundleIdentifier);
        await this.removePushCert(ctx, app);
        Log.log(chalk.green('Successfully removed Push Certificate'));
      } else {
        await this.removeSpecific(ctx, selected as IosPushCredentials);
        Log.log(chalk.green('Successfully removed Push Notification Key'));
      }
    }
    return null;
  }

  async removePushCert(ctx: Context, app: AppLookupParams): Promise<void> {
    Log.log('Removing Push Certificate');
    await ctx.ios.deletePushCert(app);
  }

  async removeSpecific(ctx: Context, selected: IosPushCredentials) {
    const credentials = await ctx.ios.getAllCredentials(this.accountName);
    const apps = getAppsUsingPushCred(credentials, selected);
    const appsList = apps.map(appCred => appCred.experienceName).join(', ');

    if (appsList && !ctx.nonInteractive) {
      Log.log('Removing Push Key');
      const confirm = await confirmAsync({
        message: `Removing this key/cert will disable notifications in ${appsList}. Do you want to continue?`,
      });
      if (!confirm) {
        Log.log('Aborting');
        return;
      }
    }

    Log.log('Removing Push Key...\n');
    await ctx.ios.deletePushKey(selected.id, this.accountName);

    let shouldRevoke = this.shouldRevoke;
    if (!shouldRevoke && !ctx.nonInteractive) {
      const revoke = await confirmAsync({
        message: `Do you also want to revoke it on Apple Developer Portal?`,
      });
      shouldRevoke = revoke;
    }

    if (shouldRevoke) {
      await ctx.ensureAppleCtx();
      await new PushKeyManager(ctx.appleCtx).revoke([selected.apnsKeyId]);
    }
  }
}

export class UpdateIosPush implements IView {
  constructor(private accountName: string) {}

  async open(ctx: Context) {
    if (ctx.nonInteractive) {
      throw new CommandError(
        'NON_INTERACTIVE',
        "Start the CLI without the '--non-interactive' flag to select a push notification credential to update."
      );
    }

    const selected = (await selectPushCredFromList(ctx, this.accountName, {
      allowLegacy: false,
    })) as IosPushCredentials;
    if (selected) {
      await this.updateSpecific(ctx, selected);

      Log.log(chalk.green('Successfully updated Push Notification Key.\n'));
      const credentials = await ctx.ios.getAllCredentials(this.accountName);
      const updated = credentials.userCredentials.find(i => i.id === selected.id);
      if (updated) {
        displayIosUserCredentials(updated);
      }
      Log.log();
    }
    return null;
  }

  async updateSpecific(ctx: Context, selected: IosPushCredentials) {
    const credentials = await ctx.ios.getAllCredentials(this.accountName);
    const apps = getAppsUsingPushCred(credentials, selected);
    const appsList = apps.map(appCred => appCred.experienceName).join(', ');

    if (apps.length > 1) {
      if (ctx.nonInteractive) {
        throw new CommandError(
          'NON_INTERACTIVE',
          `Updating credentials will affect all applications that are using this key (${appsList}). Start the CLI without the '--non-interactive' flag to confirm.`
        );
      }

      const confirm = await confirmAsync({
        message: `Update will affect all applications that are using this key (${appsList}). Do you want to continue?`,
      });
      if (!confirm) {
        Log.warn('Aborting update process');
        return;
      }
    }

    const newPushKey = await this.provideOrGenerate(ctx);
    await ctx.ios.updatePushKey(selected.id, this.accountName, newPushKey);
  }

  async provideOrGenerate(ctx: Context): Promise<PushKey> {
    const userProvided = await askForUserProvided(pushKeySchema);
    if (userProvided) {
      const isValid = await validatePushKey(ctx, userProvided);
      return isValid ? userProvided : await this.provideOrGenerate(ctx);
    }
    return await generatePushKey(ctx, this.accountName);
  }
}

export class UseExistingPushNotification implements IView {
  constructor(private app: AppLookupParams) {}

  async open(ctx: Context): Promise<IView | null> {
    if (ctx.nonInteractive) {
      throw new CommandError(
        'NON_INTERACTIVE',
        "Start the CLI without the '--non-interactive' flag to select a push notification credential to use."
      );
    }

    const selected = (await selectPushCredFromList(ctx, this.app.accountName, {
      allowLegacy: false,
    })) as IosPushCredentials;
    if (selected) {
      await ctx.ios.usePushKey(this.app, selected.id);
      Log.log(
        chalk.green(
          `Successfully assigned Push Notifactions Key to ${this.app.accountName}/${this.app.projectName} (${this.app.bundleIdentifier})`
        )
      );
    }
    return null;
  }
}

export class CreateOrReusePushKey implements IView {
  constructor(private app: AppLookupParams) {}

  async assignPushKey(ctx: Context, userCredentialsId: number) {
    await ctx.ios.usePushKey(this.app, userCredentialsId);
    Log.log(
      chalk.green(
        `Successfully assigned Push Key to ${this.app.accountName}/${this.app.projectName} (${this.app.bundleIdentifier})`
      )
    );
  }

  async open(ctx: Context): Promise<IView | null> {
    if (!ctx.user) {
      throw new Error(`This workflow requires you to be logged in.`);
    }

    const existingPushKeys = await getValidPushKeys(
      await ctx.ios.getAllCredentials(this.app.accountName),
      ctx
    );

    if (existingPushKeys.length === 0) {
      const pushKey = await new CreateIosPush(this.app.accountName).create(ctx);
      await this.assignPushKey(ctx, pushKey.id);
      return null;
    }

    // autoselect creds if we find valid keys
    const autoselectedPushKey = existingPushKeys[0];

    if (!ctx.nonInteractive) {
      const confirm = await confirmAsync({
        message: `${formatPushKey(
          autoselectedPushKey,
          await ctx.ios.getAllCredentials(this.app.accountName),
          'VALID'
        )} \n Would you like to use this Push Key?`,
        limit: Infinity,
      });
      if (!confirm) {
        return await this._createOrReuse(ctx);
      }
    }

    // Use autosuggested push key
    Log.log(`Using Push Key: ${autoselectedPushKey.apnsKeyId}`);
    await this.assignPushKey(ctx, autoselectedPushKey.id);
    return null;
  }

  async _createOrReuse(ctx: Context): Promise<IView | null> {
    const choices = [
      {
        title: '[Choose existing push key] (Recommended)',
        value: 'CHOOSE_EXISTING',
      },
      { title: '[Add a new push key]', value: 'GENERATE' },
    ];

    const question: Question = {
      type: 'select',
      name: 'action',
      message: 'Select an iOS push key to use for push notifications:',
      choices,
    };

    const { action } = await prompt(question);

    if (action === 'GENERATE') {
      const pushKey = await new CreateIosPush(this.app.accountName).create(ctx);
      await this.assignPushKey(ctx, pushKey.id);
      return null;
    } else if (action === 'CHOOSE_EXISTING') {
      return new UseExistingPushNotification(this.app);
    }

    throw new Error('unsupported action');
  }
}

async function getValidPushKeys(iosCredentials: IosCredentials, ctx: Context) {
  const pushKeys = iosCredentials.userCredentials.filter(
    (cred): cred is IosPushCredentials => cred.type === 'push-key'
  );
  if (!ctx.hasAppleCtx()) {
    Log.log(
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

type ListOptions = {
  filterInvalid?: boolean;
  allowLegacy?: boolean;
};

async function selectPushCredFromList(
  ctx: Context,
  accountName: string,
  options: ListOptions = {}
): Promise<IosPushCredentials | IosAppCredentials | null> {
  const iosCredentials = await ctx.ios.getAllCredentials(accountName);
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
    Log.warn('There are no push credentials available in your account');
    return null;
  }

  const getName = (pushCred: IosPushCredentials | IosAppCredentials) => {
    if ('type' in pushCred) {
      return formatPushKey(
        pushCred as IosPushCredentials,
        iosCredentials,
        getValidityStatus(pushCred as IosPushCredentials, validPushKeys)
      );
    }

    const pushCert = pushCred as IosAppCredentials;
    return `Push Certificate (PushId: ${pushCert.credentials.pushId || '------'}, TeamId: ${
      pushCert.credentials.teamId || '-------'
    } used in ${pushCert.experienceName})`;
  };

  const question: Question = {
    type: 'select',
    name: 'credentialsIndex',
    message: 'Select credentials from list',
    choices: pushCredentials.map((entry, index) => ({
      title: getName(entry),
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
  if ('type' in pushCred) {
    return iosCredentials.appCredentials.filter(
      cred => cred.pushCredentialsId === (pushCred as IosPushCredentials).id
    );
  } else if (pushCred.credentials?.pushP12 && pushCred.credentials?.pushPassword) {
    return [pushCred as IosAppCredentials];
  }
  return [];
}

function formatPushKeyFromApple(appleInfo: PushKeyInfo, credentials: IosCredentials): string {
  const userCredentials = credentials.userCredentials.filter(
    cred => cred.type === 'push-key' && cred.apnsKeyId === appleInfo.id
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

async function generatePushKey(ctx: Context, accountName: string): Promise<PushKey> {
  await ctx.ensureAppleCtx();
  const manager = new PushKeyManager(ctx.appleCtx);
  try {
    return await manager.create();
  } catch (e) {
    if (e.code === 'APPLE_PUSH_KEYS_TOO_MANY_GENERATED_ERROR') {
      const keys = await manager.list();
      Log.warn('Maximum number of Push Notifications Keys generated on Apple Developer Portal.');
      Log.warn(APPLE_KEYS_TOO_MANY_GENERATED_ERROR);

      if (ctx.nonInteractive) {
        throw new CommandError(
          'NON_INTERACTIVE',
          "Start the CLI without the '--non-interactive' to revoke push notification keys."
        );
      }

      const credentials = await ctx.ios.getAllCredentials(accountName);
      const usedByExpo = credentials.userCredentials
        .filter((cert): cert is IosPushCredentials => cert.type === 'push-key')
        .reduce<{ [key: string]: IosPushCredentials }>(
          (acc, cert) => ({ ...acc, [cert.apnsKeyId]: cert }),
          {}
        );

      // https://docs.expo.io/distribution/app-signing/#summary
      const here = terminalLink('here', 'https://bit.ly/3cfJJkQ');
      Log.log(chalk.grey(`⚠️  Revoking a Push Key will affect other apps that rely on it`));
      Log.log(chalk.grey(`ℹ️  Learn more ${here}`));
      Log.log();

      const { revoke } = await prompt([
        {
          type: 'multiselect',
          name: 'revoke',
          message: 'Select Push Notifications Key to revoke.',
          choices: keys.map((key, index) => ({
            value: index,
            title: formatPushKeyFromApple(key, credentials),
          })),
          optionsPerPage: 20,
        },
      ]);

      for (const index of revoke) {
        const certInfo = keys[index];
        if (certInfo && usedByExpo[certInfo.id]) {
          await new RemoveIosPush(accountName, true).removeSpecific(ctx, usedByExpo[certInfo.id]);
        } else {
          await manager.revoke([certInfo.id]);
        }
      }
    } else {
      throw e;
    }
  }
  return await generatePushKey(ctx, accountName);
}

export async function validatePushKey(ctx: Context, pushKey: PushKey) {
  if (!ctx.hasAppleCtx()) {
    Log.warn('Unable to validate Push Keys due to insufficient Apple Credentials');
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

export async function getPushKeyFromParams(builderOptions: {
  pushId?: string;
  pushP8Path?: string;
  teamId?: string;
}): Promise<PushKey | null> {
  const { pushId, pushP8Path, teamId } = builderOptions;

  // none of the pushKey params were set, assume user has no intention of passing it in
  if (!pushId && !pushP8Path) {
    return null;
  }

  // partial pushKey params were set, assume user has intention of passing it in
  if (!(pushId && pushP8Path && teamId)) {
    throw new Error(
      'In order to provide a Push Key through the CLI parameters, you have to pass --push-id, --push-p8-path and --team-id parameters.'
    );
  }

  return {
    apnsKeyId: pushId,
    apnsKeyP8: await fs.readFile(pushP8Path, 'utf8'),
    teamId,
  } as PushKey;
}

export async function usePushKeyFromParams(
  ctx: Context,
  app: AppLookupParams,
  pushKey: PushKey
): Promise<IosPushCredentials> {
  const isValid = await validatePushKey(ctx, pushKey);
  if (!isValid) {
    throw new Error('Cannot validate uploaded Push Key');
  }

  const iosPushCredentials = await ctx.ios.createPushKey(app.accountName, pushKey);

  await ctx.ios.usePushKey(app, iosPushCredentials.id);
  Log.log(
    chalk.green(
      `Successfully assigned Push Key to ${app.accountName}/${app.projectName} (${app.bundleIdentifier})`
    )
  );
  return iosPushCredentials;
}
