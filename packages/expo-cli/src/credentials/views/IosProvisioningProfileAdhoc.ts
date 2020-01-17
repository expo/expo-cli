import chalk from 'chalk';
import { Context, IView } from '../context';
import { ProvisioningProfile } from '../../appleApi';
import { ProvisioningProfileAdhocManager } from '../../appleApi/provisioningProfileAdhoc';
import log from '../../log';

export type ProvisioningProfileAdhocOptions = {
  experienceName: string;
  bundleIdentifier: string;
  distCertSerialNumber: string;
  udids: string[];
};

export class CreateOrReuseProvisioningProfileAdhoc implements IView {
  _experienceName: string;
  _bundleIdentifier: string;
  _distCertSerialNumber: string;
  _udids: string[];

  constructor(options: ProvisioningProfileAdhocOptions) {
    const { experienceName, bundleIdentifier, distCertSerialNumber, udids } = options;
    this._experienceName = experienceName;
    this._bundleIdentifier = bundleIdentifier;
    this._distCertSerialNumber = distCertSerialNumber;
    this._udids = udids;
  }

  async assignProvisioningProfile(ctx: Context, provisioningProfile: ProvisioningProfile) {
    await ctx.ios.updateProvisioningProfile(
      this._experienceName,
      this._bundleIdentifier,
      provisioningProfile,
      ctx.appleCtx.team
    );
    log(
      chalk.green(
        `Successfully assigned Provisioning Profile id: ${provisioningProfile.provisioningProfileId} to ${this._experienceName} (${this._bundleIdentifier})`
      )
    );
  }

  async createOrReuse(ctx: Context): Promise<ProvisioningProfile> {
    await ctx.ensureAppleCtx();
    const ppManager = new ProvisioningProfileAdhocManager(ctx.appleCtx);
    return await ppManager.createOrReuse(
      this._udids,
      this._bundleIdentifier,
      this._distCertSerialNumber
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
