import { AppleCtx } from './authenticate';
import { DistCertManager } from './distributionCert';
import { PushKeyManager } from './pushKey';
import { ProvisioningProfileManager } from './provisioningProfile';

export const createManagers = (ctx: AppleCtx) => ({
  distributionCert: new DistCertManager(ctx),
  pushKey: new PushKeyManager(ctx),
  provisioningProfile: new ProvisioningProfileManager(ctx),
});
