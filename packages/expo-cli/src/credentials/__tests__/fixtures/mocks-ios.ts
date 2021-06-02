import merge from 'lodash/merge';

import {
  DistCert,
  DistCertInfo,
  ProvisioningProfile,
  ProvisioningProfileInfo,
  PushKey,
  PushKeyInfo,
  Team,
} from '../../../appleApi';
import { IosDistCredentials, IosPushCredentials } from '../../credentials';
import { testProvisioningProfileBase64 } from './mock-base64-data';
import { testBundleIdentifier, testExperienceName } from './mocks-constants';

const today = new Date();
const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

export const testAppleTeam: Team = {
  id: 'test-team-id',
};
export const testProvisioningProfile: ProvisioningProfile = {
  provisioningProfileId: 'test-id',
  provisioningProfile: testProvisioningProfileBase64,
  teamId: 'id',
};
export const testProvisioningProfiles = [testProvisioningProfile];
export const testProvisioningProfileFromApple: ProvisioningProfileInfo = {
  name: 'test-name',
  status: 'Active',
  expires: tomorrow.getTime(),
  distributionMethod: 'test',
  certificates: [],
  provisioningProfileId: testProvisioningProfile.provisioningProfileId,
  provisioningProfile: testProvisioningProfile.provisioningProfile,
  teamId: 'id',
};
export const testProvisioningProfilesFromApple = [testProvisioningProfileFromApple];

export const testDistCert: DistCert = {
  certP12: 'Y2VydHAxMg==',
  certPassword: 'test-password',
  distCertSerialNumber: 'test-serial',
  teamId: 'test-team-id',
};
export const testIosDistCredential: IosDistCredentials = {
  id: 1,
  type: 'dist-cert',
  ...testDistCert,
};
export const testIosDistCredentials = [testIosDistCredential];
export const testDistCertFromApple: DistCertInfo = {
  id: 'test-id',
  name: 'test-name',
  status: 'Active',
  created: today.getTime(),
  expires: tomorrow.getTime(),
  ownerName: 'test-owner',
  ownerId: 'test-id',
  serialNumber: testIosDistCredential.distCertSerialNumber as string,
};
export const testDistCertsFromApple = [testDistCertFromApple];

export const testPushKey: PushKey = {
  apnsKeyP8: 'test-p8',
  apnsKeyId: 'test-key-id',
  teamId: 'test-team-id',
};

export const testIosPushCredential: IosPushCredentials = {
  id: 2,
  type: 'push-key',
  ...testPushKey,
};
export const testIosPushCredentials = [testIosPushCredential];
export const testPushKeyFromApple: PushKeyInfo = {
  id: testIosPushCredential.apnsKeyId,
  name: 'test-name',
};
export const testPushKeysFromApple = [testPushKeyFromApple];
export const testLegacyPushCert = {
  pushId: 'test-push-id',
  pushP12: 'test-push-p12',
  pushPassword: 'test-push-password',
};
export const testAppCredential = {
  experienceName: testExperienceName,
  bundleIdentifier: testBundleIdentifier,
  distCredentialsId: testIosDistCredential.id,
  pushCredentialsId: testIosPushCredential.id,
  credentials: {
    ...testProvisioningProfile,
  },
};
export const testAllCredentialsForApp = {
  ...testAppCredential,
  pushCredentials: testPushKey,
  distCredentials: testDistCert,
};
export const testAppCredentials = [testAppCredential];
export const testAllCredentials = {
  userCredentials: [...testIosDistCredentials, ...testIosPushCredentials],
  appCredentials: testAppCredentials,
};

export function getApiV2WrapperMock(override: object = {}) {
  // by default all method throw exceptions to make sure that we only call what is expected
  const getUnexpectedCallMock = () =>
    jest.fn(() => {
      throw new Error('unexpected call');
    });
  return merge(
    {
      getAllCredentialsApi: getUnexpectedCallMock(),
      getAllCredentialsForAppApi: getUnexpectedCallMock(),
      getUserCredentialsByIdApi: getUnexpectedCallMock(),
      createDistCertApi: getUnexpectedCallMock(),
      updateDistCertApi: getUnexpectedCallMock(),
      deleteDistCertApi: getUnexpectedCallMock(),
      useDistCertApi: getUnexpectedCallMock(),
      createPushKeyApi: getUnexpectedCallMock(),
      updatePushKeyApi: getUnexpectedCallMock(),
      deletePushKeyApi: getUnexpectedCallMock(),
      usePushKeyApi: getUnexpectedCallMock(),
      deletePushCertApi: getUnexpectedCallMock(),
      updateProvisioningProfileApi: getUnexpectedCallMock(),
      deleteProvisioningProfileApi: getUnexpectedCallMock(),
    },
    override
  );
}

export function getIosApiMock(override: object = {}) {
  return merge(
    {
      getDistCert: jest.fn(() => testDistCert),
      createDistCert: jest.fn(() => testIosDistCredential),
      useDistCert: jest.fn(),
      getPushKey: jest.fn(() => testPushKey),
      createPushKey: jest.fn(() => testIosPushCredential),
      usePushKey: jest.fn(),
      updateProvisioningProfile: jest.fn(),
      getAppCredentials: jest.fn(() => testAppCredential),
      getProvisioningProfile: jest.fn(() => testProvisioningProfile),
      getAllCredentials: jest.fn(() => testAllCredentials),
    },
    override
  );
}

export const appleCtxMock = {
  appleId: 'test-id',
  appleIdPassword: 'test-password',
  team: { id: 'test-team-id' },
  fastlaneSession: 'test-fastlane-session',
};
