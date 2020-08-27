import { AppLookupParams } from '../api/IosApi';
import { Context, IView } from '../context';
import * as iosDistView from './IosDistCert';

export class SetupIosDist implements IView {
  constructor(private app: AppLookupParams) {}

  async open(ctx: Context): Promise<IView | null> {
    if (!ctx.user) {
      throw new Error(`This workflow requires you to be logged in.`);
    }

    const configuredDistCert = await ctx.ios.getDistCert(this.app);

    if (configuredDistCert) {
      // we dont need to setup if we have a valid dist cert on file
      const isValid = await iosDistView.validateDistributionCertificate(ctx, configuredDistCert);
      if (isValid) {
        return null;
      }
    }

    return new iosDistView.CreateOrReuseDistributionCert(this.app);
  }
}
