import { Keys } from '@expo/apple-utils';
import chalk from 'chalk';
import dateformat from 'dateformat';

import CommandError from '../CommandError';
import Log from '../log';
import { ora } from '../utils/ora';
import { AppleCtx, getRequestContext } from './authenticate';

export type PushKeyInfo = {
  id: string;
  name: string;
};

export type PushKey = {
  apnsKeyP8: string;
  apnsKeyId: string;
  teamId: string;
  teamName?: string;
};

export function isPushKey(obj: { [key: string]: any }): obj is PushKey {
  return (
    obj.apnsKeyP8 &&
    typeof obj.apnsKeyP8 === 'string' &&
    obj.apnsKeyId &&
    typeof obj.apnsKeyId === 'string' &&
    obj.teamId &&
    typeof obj.teamId === 'string'
  );
}

const { MaxKeysCreatedError } = Keys;

const APPLE_KEYS_TOO_MANY_GENERATED_ERROR = `
You can have only ${chalk.underline('two')} Apple Keys generated on your Apple Developer account.
Please revoke the old ones or reuse existing from your other apps.
Please remember that Apple Keys are not application specific!
`;

async function listPushKeysAsync(authCtx: AppleCtx): Promise<PushKeyInfo[]> {
  const spinner = ora(`Fetching Apple push keys`).start();
  try {
    const context = getRequestContext(authCtx);
    const keys = await Keys.getKeysAsync(context);
    spinner.succeed(`Fetched Apple push keys`);
    return keys;
  } catch (error) {
    spinner.fail(`Failed to fetch Apple push keys`);
    throw error;
  }
}

async function createPushKeyAsync(
  authCtx: AppleCtx,
  name: string = `Expo Push Notifications Key ${dateformat('yyyymmddHHMMss')}`
): Promise<PushKey> {
  const spinner = ora(`Creating Apple push key`).start();
  try {
    const context = getRequestContext(authCtx);
    const key = await Keys.createKeyAsync(context, { name, isApns: true });
    const apnsKeyP8 = await Keys.downloadKeyAsync(context, { id: key.id });
    spinner.succeed(`Created Apple push key`);
    return {
      apnsKeyId: key.id,
      apnsKeyP8,
      teamId: authCtx.team.id,
      teamName: authCtx.team.name,
    };
  } catch (err) {
    spinner.fail('Failed to create Apple push key');
    const resultString = err.rawDump?.resultString;
    if (
      err instanceof MaxKeysCreatedError ||
      (resultString && resultString.match(/maximum allowed number of Keys/))
    ) {
      throw new CommandError(APPLE_KEYS_TOO_MANY_GENERATED_ERROR);
    }
    throw err;
  }
}

async function revokePushKeyAsync(authCtx: AppleCtx, ids: string[]): Promise<void> {
  const name = `Apple push key${ids?.length === 1 ? '' : 's'}`;

  const spinner = ora(`Revoking ${name}`).start();
  try {
    const context = getRequestContext(authCtx);
    await Promise.all(ids.map(id => Keys.revokeKeyAsync(context, { id })));

    spinner.succeed(`Revoked ${name}`);
  } catch (error) {
    Log.error(error);
    spinner.fail(`Failed to revoke ${name}`);
    throw error;
  }
}

export class PushKeyManager {
  ctx: AppleCtx;
  constructor(appleCtx: AppleCtx) {
    this.ctx = appleCtx;
  }

  async list(): Promise<PushKeyInfo[]> {
    return listPushKeysAsync(this.ctx);
  }

  async create(name?: string): Promise<PushKey> {
    return createPushKeyAsync(this.ctx, name);
  }

  async revoke(ids: string[]) {
    return revokePushKeyAsync(this.ctx, ids);
  }

  format({ id, name }: PushKeyInfo): string {
    return `${name} - ID: ${id}`;
  }
}
