import ora from 'ora';

import { AppleCtx } from './authenticate';
import { runAction, travelingFastlane } from './fastlane';
import { ProvisioningProfile } from './provisioningProfile';

export class ProvisioningProfileAdhocManager {
  ctx: AppleCtx;
  constructor(appleCtx: AppleCtx) {
    this.ctx = appleCtx;
  }

  async createOrReuse(
    udids: string[],
    bundleIdentifier: string,
    distCertSerialNumber: string
  ): Promise<ProvisioningProfile> {
    const spinner = ora(
      `Handling Adhoc provisioning profiles on Apple Developer Portal...`
    ).start();
    const args = [
      '--apple-id',
      this.ctx.appleId,
      '--apple-password',
      this.ctx.appleIdPassword,
      this.ctx.team.id,
      udids.join(','),
      bundleIdentifier,
      distCertSerialNumber,
    ];
    const adhocProvisioningProfile = await runAction(
      travelingFastlane.manageAdHocProvisioningProfile,
      args
    );

    const {
      provisioningProfileUpdateTimestamp,
      provisioningProfileCreateTimestamp,
      provisioningProfileName,
    } = adhocProvisioningProfile;
    if (provisioningProfileCreateTimestamp) {
      spinner.succeed(`Created new profile: ${provisioningProfileName}`);
    } else if (provisioningProfileUpdateTimestamp) {
      spinner.succeed(`Updated existing profile: ${provisioningProfileName}`);
    } else {
      spinner.succeed(`Used existing profile: ${provisioningProfileName}`);
    }

    delete adhocProvisioningProfile.provisioningProfileUpdateTimestamp;
    delete adhocProvisioningProfile.provisioningProfileCreateTimestamp;
    delete adhocProvisioningProfile.provisioningProfileName;

    return {
      ...adhocProvisioningProfile,
      teamId: this.ctx.team.id,
      teamName: this.ctx.team.name,
    };
  }
}
