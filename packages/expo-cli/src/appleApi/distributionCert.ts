import dateformat from 'dateformat';
import get from 'lodash/get';

import CommandError from '../CommandError';
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
}

export type DistCert = {
  certId: string;
  certP12: string;
  certPassword: string;
  certPrivateSigningKey: string;
  distCertSerialNumber: string;
}

export class DistCertManager {
  ctx: AppleCtx;
  constructor(appleCtx: AppleCtx) {
    this.ctx = appleCtx;
  }

  async list(): Promise<DistCertInfo[]> {
    const args = ['list', this.ctx.appleId, this.ctx.appleIdPassword, this.ctx.team.id, String(this.ctx.team.inHouse)];
    const { certs } = await runAction(travelingFastlane.manageDistCerts, args);
    return certs;
  }
  async create(): Promise<DistCert> {
    try {
      const args = ['create', this.ctx.appleId, this.ctx.appleIdPassword, this.ctx.team.id, String(this.ctx.team.inHouse)];
      return await runAction(travelingFastlane.manageDistCerts, args);
    } catch (err) {
      const resultString = get(err, 'rawDump.resultString');
      if (resultString && resultString.match(/Maximum number of certificates generated/)) {
        throw new CommandError('APPLE_DIST_CERTS_TOO_MANY_GENERATED_ERROR');
      }
      throw err;
    }
  }
  async revoke(ids: string[]) {
    const args = ['revoke', this.ctx.appleId, this.ctx.appleIdPassword, this.ctx.team.id, String(this.ctx.team.inHouse), ids.join(',')];
    await runAction(travelingFastlane.manageDistCerts, args);
  }

  format({ name, id, status, expires, created, ownerName }: DistCertInfo): string {
    const expiresDate = _formatTimestamp(expires);
    const createdDate = _formatTimestamp(created);
    return `${name} (${status}) - ID: ${id} - expires: ${expiresDate} (created: ${createdDate}) - owner: ${ownerName}`;
  }
};

function _formatTimestamp(timestamp: number): string {
  return dateformat(new Date(timestamp * 1000));
}

