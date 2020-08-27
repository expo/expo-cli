import chalk from 'chalk';
import dateformat from 'dateformat';
import ora from 'ora';

import CommandError, { ErrorCodes } from '../CommandError';
import log from '../log';
import { AppleCtx } from './authenticate';
import { runAction, travelingFastlane } from './fastlane';

export type DistCertInfo = {
  id: string;
  name: string;
  status: string;
  created: number;
  expires: number;
  ownerType: string;
  ownerName: string;
  ownerId: string;
  serialNumber: string;
};

export type DistCert = {
  certId?: string;
  certP12: string;
  certPassword: string;
  certPrivateSigningKey?: string;
  distCertSerialNumber?: string;
  teamId: string;
  teamName?: string;
};

export function isDistCert(obj: { [key: string]: any }): obj is DistCert {
  return (
    obj.certP12 &&
    typeof obj.certP12 === 'string' &&
    obj.certPassword &&
    typeof obj.certPassword === 'string' &&
    obj.teamId &&
    typeof obj.teamId === 'string'
  );
}

const APPLE_DIST_CERTS_TOO_MANY_GENERATED_ERROR = `
You can have only ${chalk.underline(
  'three'
)} Apple Distribution Certificates generated on your Apple Developer account.
Please revoke the old ones or reuse existing from your other apps.
Please remember that Apple Distribution Certificates are not application specific!
`;

export class DistCertManager {
  ctx: AppleCtx;
  constructor(appleCtx: AppleCtx) {
    this.ctx = appleCtx;
  }

  async list(): Promise<DistCertInfo[]> {
    const spinner = ora(`Getting Distribution Certificates from Apple...`).start();
    const args = [
      'list',
      this.ctx.appleId,
      this.ctx.appleIdPassword,
      this.ctx.team.id,
      String(this.ctx.team.inHouse),
    ];
    const { certs } = await runAction(travelingFastlane.manageDistCerts, args);
    spinner.succeed();
    return certs;
  }
  async create(): Promise<DistCert> {
    const spinner = ora(`Creating Distribution Certificate on Apple Servers...`).start();
    try {
      const args = [
        'create',
        this.ctx.appleId,
        this.ctx.appleIdPassword,
        this.ctx.team.id,
        String(this.ctx.team.inHouse),
      ];
      const result = {
        ...(await runAction(travelingFastlane.manageDistCerts, args)),
        teamId: this.ctx.team.id,
        teamName: this.ctx.team.name,
      };
      spinner.succeed();
      return result;
    } catch (err) {
      spinner.stop();
      const resultString = err.rawDump?.resultString;
      if (resultString && resultString.match(/Maximum number of certificates generated/)) {
        throw new CommandError(
          ErrorCodes.APPLE_DIST_CERTS_TOO_MANY_GENERATED_ERROR,
          APPLE_DIST_CERTS_TOO_MANY_GENERATED_ERROR
        );
      }
      throw err;
    }
  }
  async revoke(ids: string[]) {
    const spinner = ora(`Revoking Distribution Certificate on Apple Servers...`).start();
    try {
      const args = [
        'revoke',
        this.ctx.appleId,
        this.ctx.appleIdPassword,
        this.ctx.team.id,
        String(this.ctx.team.inHouse),
        ids.join(','),
      ];
      await runAction(travelingFastlane.manageDistCerts, args);
      spinner.succeed();
    } catch (error) {
      log.error(error);
      spinner.fail('Failed to revoke Distribution Certificate on Apple Servers');
      throw error;
    }
  }

  format({ name, id, status, expires, created, ownerName }: DistCertInfo): string {
    const expiresDate = _formatTimestamp(expires);
    const createdDate = _formatTimestamp(created);
    return `${name} (${status}) - ID: ${id} - expires: ${expiresDate} (created: ${createdDate}) - owner: ${ownerName}`;
  }
}

function _formatTimestamp(timestamp: number): string {
  return dateformat(new Date(timestamp * 1000));
}
