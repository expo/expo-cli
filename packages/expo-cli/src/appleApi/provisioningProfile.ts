import { IosCodeSigning } from '@expo/xdl';
import ora from 'ora';

import { AppleCtx } from './authenticate';
import { DistCert, DistCertInfo } from './distributionCert';
import { runAction, travelingFastlane } from './fastlane';

export type ProvisioningProfileInfo = {
  name: string;
  status: string;
  expires: number;
  distributionMethod: string;
  certificates: DistCertInfo[];
} & ProvisioningProfile;

export type ProvisioningProfile = {
  provisioningProfileId?: string;
  provisioningProfile: string;
  teamId: string;
  teamName?: string;
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
    const spinner = ora(`Configuring existing Provisioning Profiles from Apple...`).start();
    if (!provisioningProfile.provisioningProfileId) {
      throw new Error('Provisioning profile: cannot use existing profile, insufficient id');
    }

    if (!distCert.distCertSerialNumber) {
      distCert.distCertSerialNumber = IosCodeSigning.findP12CertSerialNumber(
        distCert.certP12,
        distCert.certPassword
      ) as string;
    }

    const args = [
      'use-existing',
      this.ctx.appleId,
      this.ctx.appleIdPassword,
      this.ctx.team.id,
      String(this.ctx.team.inHouse),
      bundleIdentifier,
      provisioningProfile.provisioningProfileId,
      distCert.distCertSerialNumber,
    ];
    const result = await runAction(travelingFastlane.manageProvisioningProfiles, args);
    spinner.succeed();
    return {
      ...result,
      teamId: this.ctx.team.id,
      teamName: this.ctx.team.name,
    };
  }

  async list(bundleIdentifier: string): Promise<ProvisioningProfileInfo[]> {
    const spinner = ora(`Getting Provisioning Profiles from Apple...`).start();
    const args = [
      'list',
      this.ctx.appleId,
      this.ctx.appleIdPassword,
      this.ctx.team.id,
      String(this.ctx.team.inHouse),
      bundleIdentifier,
    ];
    const { profiles } = await runAction(travelingFastlane.manageProvisioningProfiles, args);
    spinner.succeed();
    return profiles.map((profile: Omit<ProvisioningProfileInfo, 'teamId' | 'teamName'>) => ({
      ...profile,
      teamId: this.ctx.team.id,
      teamName: this.ctx.team.name,
    }));
  }

  async create<T extends DistCert>(
    bundleIdentifier: string,
    distCert: T,
    profileName: string
  ): Promise<ProvisioningProfile> {
    const spinner = ora(`Creating Provisioning Profile on Apple Servers...`).start();
    if (!distCert.distCertSerialNumber) {
      distCert.distCertSerialNumber = IosCodeSigning.findP12CertSerialNumber(
        distCert.certP12,
        distCert.certPassword
      ) as string;
    }

    const args = [
      'create',
      this.ctx.appleId,
      this.ctx.appleIdPassword,
      this.ctx.team.id,
      String(this.ctx.team.inHouse),
      bundleIdentifier,
      distCert.distCertSerialNumber,
      profileName,
    ];
    const result = await runAction(travelingFastlane.manageProvisioningProfiles, args);
    spinner.succeed();
    return {
      ...result,
      teamId: this.ctx.team.id,
      teamName: this.ctx.team.name,
    };
  }

  async revoke(bundleIdentifier: string) {
    const spinner = ora(`Revoking Provisioning Profile on Apple Servers...`).start();
    const args = [
      'revoke',
      this.ctx.appleId,
      this.ctx.appleIdPassword,
      this.ctx.team.id,
      String(this.ctx.team.inHouse),
      bundleIdentifier,
    ];
    await runAction(travelingFastlane.manageProvisioningProfiles, args);
    spinner.succeed();
  }
}
