import plist, { PlistObject } from 'plist';
import { runAction, travelingFastlane } from './fastlane';
import { AppleCtx } from './authenticate';
import { DistCert, DistCertInfo } from './distributionCert';

export type ProvisioningProfileInfo = {
  name: string;
  status: string;
  expires: number;
  distributionMethod: string;
  certificates: DistCertInfo[];
} & ProvisioningProfile;

export type ProvisioningProfile = {
  provisioningProfileId: string;
  provisioningProfile: string;
};

export class ProvisioningProfileManager {
  ctx: AppleCtx;
  constructor(appleCtx: AppleCtx) {
    this.ctx = appleCtx;
  }

  async useExisting<T extends DistCert>(
    bundleIdentifier: string,
    provisioningProfile: ProvisioningProfile,
    distCert: T
  ): Promise<ProvisioningProfile> {
    const args = [
      'use-existing',
      this.ctx.appleId,
      this.ctx.appleIdPassword,
      this.ctx.team.id,
      String(this.ctx.team.inHouse),
      bundleIdentifier,
      provisioningProfile.provisioningProfileId,
      distCert.distCertSerialNumber || '__last__',
    ];
    return await runAction(travelingFastlane.manageProvisioningProfiles, args);
  }

  async list(bundleIdentifier: string): Promise<ProvisioningProfileInfo[]> {
    const args = [
      'list',
      this.ctx.appleId,
      this.ctx.appleIdPassword,
      this.ctx.team.id,
      String(this.ctx.team.inHouse),
      bundleIdentifier,
    ];
    const { profiles } = await runAction(travelingFastlane.manageProvisioningProfiles, args);
    return profiles;
  }

  async create<T extends DistCert>(
    bundleIdentifier: string,
    distCert: T,
    profileName: string
  ): Promise<ProvisioningProfile> {
    const args = [
      'create',
      this.ctx.appleId,
      this.ctx.appleIdPassword,
      this.ctx.team.id,
      String(this.ctx.team.inHouse),
      bundleIdentifier,
      distCert.distCertSerialNumber || '__last__',
      profileName,
    ];
    return await runAction(travelingFastlane.manageProvisioningProfiles, args);
  }

  async revoke(bundleIdentifier: string) {
    const args = [
      'revoke',
      this.ctx.appleId,
      this.ctx.appleIdPassword,
      this.ctx.team.id,
      String(this.ctx.team.inHouse),
      bundleIdentifier,
    ];
    await runAction(travelingFastlane.manageProvisioningProfiles, args);
  }

  static isExpired(base64EncodedProfile: string): boolean {
    const buffer = Buffer.from(base64EncodedProfile, 'base64');
    const profile = buffer.toString('utf-8');
    const profilePlist = plist.parse(profile) as PlistObject;
    return new Date(profilePlist['ExpirationDate'] as string) <= new Date();
  }
}
