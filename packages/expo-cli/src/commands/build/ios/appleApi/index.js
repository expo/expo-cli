import authenticate from '../../../../appleApi/authenticate';
import createDistributionCertManager from './distributionCert';
import createPushKeyManager from './pushKey';
import { ProvisioningProfileManager } from '../../../../appleApi/provisioningProfile';
import ensureAppExists from '../../../../appleApi/ensureAppExists';
import setup from '../../../../appleApi/setup';

const createManagers = ctx => ({
  distributionCert: createDistributionCertManager(ctx),
  pushKey: createPushKeyManager(ctx),
  provisioningProfile: new ProvisioningProfileManager(ctx),
});

export { authenticate, createManagers, ensureAppExists, setup };
