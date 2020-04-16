const today = new Date();
const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
export const testProvisioningProfile = {
  provisioningProfileId: 'test-id',
};
export const testProvisioningProfiles = [testProvisioningProfile];
export const testProvisioningProfileFromApple = {
  name: 'test-name',
  status: 'Active',
  expires: tomorrow,
  distributionMethod: 'test',
  certificates: [],
  provisioningProfileId: testProvisioningProfile.provisioningProfileId,
};
export const testProvisioningProfilesFromApple = [testProvisioningProfileFromApple];

export const testDistCert = {
  id: 1,
  type: 'dist-cert',
  certP12: 'test-p12',
  certPassword: 'test-password',
  distCertSerialNumber: 'test-serial',
  teamId: 'test-team-id',
};
export const testDistCerts = [testDistCert];
export const testDistCertFromApple = {
  id: 'test-id',
  status: 'Active',
  created: today.getTime(),
  expires: tomorrow.getTime(),
  serialNumber: testDistCert.distCertSerialNumber,
};
export const testDistCertsFromApple = [testDistCertFromApple];

export const testPushKey = {
  id: 1,
  type: 'push-key',
  apnsKeyP8: 'test-p8',
  apnsKeyId: 'test-key-id',
  teamId: 'test-team-id',
};
export const testPushKeys = [testPushKey];
export const testPushKeyFromApple = {
  id: testPushKey.apnsKeyId,
  name: 'test-name',
};
export const testPushKeysFromApple = [testPushKeyFromApple];

export const testAppCredentials = [{ experienceName: 'testApp', bundleIdentifier: 'test.com.app' }];
export function getCtxMock() {
  return {
    ios: {
      getDistCert: jest.fn(),
      createDistCert: jest.fn(() => testDistCert),
      useDistCert: jest.fn(),
      getPushKey: jest.fn(),
      createPushKey: jest.fn(() => testPushKey),
      usePushKey: jest.fn(),
      updateProvisioningProfile: jest.fn(),
      getAppCredentials: jest.fn(() => testAppCredentials),
      getProvisioningProfile: jest.fn(),
      credentials: {
        userCredentials: [...testDistCerts, ...testPushKeys],
        appCredentials: testAppCredentials,
      },
    },
    appleCtx: {
      appleId: 'test-id',
      appleIdPassword: 'test-password',
      team: { id: 'test-team-id' },
      fastlaneSession: 'test-fastlane-session',
    },
    ensureAppleCtx: jest.fn(),
    user: jest.fn(),
    hasAppleCtx: jest.fn(() => true),
  };
}
