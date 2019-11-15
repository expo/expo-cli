import authenticate from '../../../../appleApi/authenticate';
import { DistCertManager } from '../../../../appleApi/distributionCert';
import { PushKeyManager } from '../../../../appleApi/pushKey';
import { ProvisioningProfileManager } from '../../../../appleApi/provisioningProfile';
import ensureAppExists from '../../../../appleApi/ensureAppExists';
import setup from '../../../../appleApi/setup';

const createManagers = ctx => ({
  distributionCert: new DistCertManager(ctx),
  pushKey: new PushKeyManager(ctx),
  provisioningProfile: new ProvisioningProfileManager(ctx),
});

export { authenticate, createManagers, ensureAppExists, setup };
