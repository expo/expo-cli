import chalk from 'chalk';
import dateformat from 'dateformat';
import ora from 'ora';

import CommandError, { ErrorCodes } from '../CommandError';
import log from '../log';
import { AppleCtx } from './authenticate';
import { runAction, travelingFastlane } from './fastlane';

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

const APPLE_KEYS_TOO_MANY_GENERATED_ERROR = `
You can have only ${chalk.underline('two')} Apple Keys generated on your Apple Developer account.
Please revoke the old ones or reuse existing from your other apps.
Please remember that Apple Keys are not application specific!
`;

export class PushKeyManager {
  ctx: AppleCtx;
  constructor(appleCtx: AppleCtx) {
    this.ctx = appleCtx;
  }

  async list(): Promise<PushKeyInfo[]> {
    const spinner = ora(`Getting Push Keys from Apple...`).start();
    const args = ['list', this.ctx.appleId, this.ctx.appleIdPassword, this.ctx.team.id];
    const { keys } = await runAction(travelingFastlane.managePushKeys, args);
    spinner.succeed();
    return keys;
  }

  async create(
    name = `Expo Push Notifications Key ${dateformat('yyyymmddHHMMss')}`
  ): Promise<PushKey> {
    const spinner = ora(`Creating Push Key on Apple Servers...`).start();
    try {
      const args = ['create', this.ctx.appleId, this.ctx.appleIdPassword, this.ctx.team.id, name];
      const { apnsKeyId, apnsKeyP8 } = await runAction(travelingFastlane.managePushKeys, args);
      spinner.succeed();
      return {
        apnsKeyId,
        apnsKeyP8,
        teamId: this.ctx.team.id,
        teamName: this.ctx.team.name,
      };
    } catch (err) {
      spinner.stop();
      const resultString = err.rawDump?.resultString;
      if (resultString && resultString.match(/maximum allowed number of Keys/)) {
        throw new CommandError(
          ErrorCodes.APPLE_PUSH_KEYS_TOO_MANY_GENERATED_ERROR,
          APPLE_KEYS_TOO_MANY_GENERATED_ERROR
        );
      }
      throw err;
    }
  }

  async revoke(ids: string[]) {
    const spinner = ora(`Revoking Push Key on Apple Servers...`).start();
    try {
      const args = [
        'revoke',
        this.ctx.appleId,
        this.ctx.appleIdPassword,
        this.ctx.team.id,
        ids.join(','),
      ];
      await runAction(travelingFastlane.managePushKeys, args);
      spinner.succeed();
    } catch (error) {
      log.error(error);
      spinner.fail('Failed to revoke Push Key on Apple Servers');
      throw error;
    }
  }

  format({ id, name }: PushKeyInfo): string {
    return `${name} - ID: ${id}`;
  }
}
