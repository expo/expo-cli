import get from 'lodash/get';
import dateformat from 'dateformat';
import chalk from 'chalk';
import CommandError, { ErrorCodes } from '../CommandError';

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
    const args = ['list', this.ctx.appleId, this.ctx.appleIdPassword, this.ctx.team.id];
    const { keys } = await runAction(travelingFastlane.managePushKeys, args);
    return keys;
  }

  async create(
    name = `Expo Push Notifications Key ${dateformat('yyyymmddHHMMss')}`
  ): Promise<PushKey> {
    try {
      const args = ['create', this.ctx.appleId, this.ctx.appleIdPassword, this.ctx.team.id, name];
      const { apnsKeyId, apnsKeyP8 } = await runAction(travelingFastlane.managePushKeys, args);
      return {
        apnsKeyId,
        apnsKeyP8,
        teamId: this.ctx.team.id,
        teamName: this.ctx.team.name,
      };
    } catch (err) {
      const resultString = get(err, 'rawDump.resultString');
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
    const args = [
      'revoke',
      this.ctx.appleId,
      this.ctx.appleIdPassword,
      this.ctx.team.id,
      ids.join(','),
    ];
    await runAction(travelingFastlane.managePushKeys, args);
  }

  format({ id, name }: PushKeyInfo): string {
    return `${name} - ID: ${id}`;
  }
}
