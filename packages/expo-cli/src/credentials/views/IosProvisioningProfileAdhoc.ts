import chalk from 'chalk';

import { ProvisioningProfile } from '../../appleApi';
import { ProvisioningProfileAdhocManager } from '../../appleApi/provisioningProfileAdhoc';
import Log from '../../log';
import { AppLookupParams } from '../api/IosApi';
import { Context, IView } from '../context';

export type ProvisioningProfileAdhocOptions = {
  distCertSerialNumber: string;
  udids: string[];
};

export class CreateOrReuseProvisioningProfileAdhoc implements IView {
  private distCertSerialNumber: string;
  private udids: string[];

  constructor(private app: AppLookupParams, options: ProvisioningProfileAdhocOptions) {
    const { distCertSerialNumber, udids } = options;
    this.distCertSerialNumber = distCertSerialNumber;
    this.udids = udids;
  }

  async assignProvisioningProfile(ctx: Context, provisioningProfile: ProvisioningProfile) {
    await ctx.ios.updateProvisioningProfile(this.app, provisioningProfile);
    Log.log(
      chalk.green(
        `Successfully assigned Provisioning Profile id: ${provisioningProfile.provisioningProfileId} to @${this.app.accountName}/${this.app.projectName} (${this.app.bundleIdentifier})`
      )
    );
  }

  async createOrReuse(ctx: Context): Promise<ProvisioningProfile> {
    await ctx.ensureAppleCtx();
    const ppManager = new ProvisioningProfileAdhocManager(ctx.appleCtx);
    return await ppManager.createOrReuse(
      this.udids,
      this.app.bundleIdentifier,
      this.distCertSerialNumber
    );
  }

  async open(ctx: Context): Promise<IView | null> {
    if (!ctx.user) {
      throw new Error(`This workflow requires you to be logged in.`);
    }

    const provisioningProfile = await this.createOrReuse(ctx);
    await this.assignProvisioningProfile(ctx, provisioningProfile);
    return null;
  }
}
