import { runAction, travelingFastlane } from './fastlane';
import { AppleCtx } from './authenticate';

export type ProvisioningProfile = {
  provisioningProfileId: string;
  provisioningProfile: string;
}

export class ProvisioningProfileManager {
  ctx: AppleCtx;
  constructor(appleCtx: AppleCtx) {
    this.ctx = appleCtx;
  }

  async create(bundleIdentifier: string, metadata: any = {}): Promise<ProvisioningProfile> {
    const args = [
      'create',
      this.ctx.appleId,
      this.ctx.appleIdPassword,
      this.ctx.team.id,
      this.ctx.team.inHouse,
      bundleIdentifier,
      metadata.distCertSerialNumber || '__last__',
    ];
    return await runAction(travelingFastlane.manageProvisioningProfiles, args);
  }

  async revoke(bundleIdentifier: string) {
    const args = ['revoke', this.ctx.appleId, this.ctx.appleIdPassword, this.ctx.team.id, String(this.ctx.team.inHouse), bundleIdentifier];
    await runAction(travelingFastlane.manageProvisioningProfiles, args);
  }
};
