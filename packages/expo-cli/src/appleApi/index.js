import authenticate from './authenticate';
import distributionCertManager from './distributionCert';
import pushKeyManager from './pushKey';
import provisioningProfileManager from './provisioningProfile';
import ensureAppExists from './ensureAppExists';
import setup from './setup';

const createManagers = ctx => ({
  distributionCert: distributionCertManager(ctx),
  pushKey: pushKeyManager(ctx),
  provisioningProfile: provisioningProfileManager(ctx),
});

export {
  authenticate,
  createManagers,
  ensureAppExists,
  setup,
  distributionCertManager,
  pushKeyManager,
  provisioningProfileManager,
};
