import { AppleCtx } from './authenticate';
import { DistCertManager } from './distributionCert';
import { ProvisioningProfileManager } from './provisioningProfile';
import { PushKeyManager } from './pushKey';

export const createManagers = (ctx: AppleCtx) => ({
  distributionCert: new DistCertManager(ctx),
  pushKey: new PushKeyManager(ctx),
  provisioningProfile: new ProvisioningProfileManager(ctx),
});
