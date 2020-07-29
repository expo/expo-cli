import { User } from '@expo/xdl';
import merge from 'lodash/merge';

import {
  DistCert,
  DistCertInfo,
  ProvisioningProfile,
  ProvisioningProfileInfo,
  PushKey,
  PushKeyInfo,
  Team,
} from '../../appleApi';
import { IosDistCredentials, IosPushCredentials } from '../credentials';

/*
Mock Credential objects for Jester
*/
const today = new Date();
const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
export const testSlug = 'testApp';
export const testExperienceName = `@jester/${testSlug}`;
export const testBundleIdentifier = 'test.com.app';
export const testAppLookupParams = {
  accountName: 'jester',
  projectName: testSlug,
  bundleIdentifier: testBundleIdentifier,
};
export const testAppleTeam: Team = {
  id: 'test-team-id',
};
export const testProvisioningProfile: ProvisioningProfile = {
  provisioningProfileId: 'test-id',
  provisioningProfile: 'test',
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
  certP12: 'test-p12',
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
  ownerType: 'test-owner-type',
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

export const jester: User = {
  kind: 'user',
  username: 'jester',
  nickname: 'jester',
  userId: 'jester-id',
  picture: 'jester-pic',
  userMetadata: { onboarded: true },
  currentConnection: 'Username-Password-Authentication',
  sessionSecret: 'jester-secret',
};

export const jester2: User = {
  kind: 'user',
  username: 'jester2',
  nickname: 'jester2',
  userId: 'jester2-id',
  picture: 'jester2-pic',
  userMetadata: { onboarded: true },
  currentConnection: 'Username-Password-Authentication',
  sessionSecret: 'jester2-secret',
};

export function getApiV2MockCredentials(overridenMock: { [key: string]: any } = {}) {
  const defaultCredentialsApiV2Mock = {
    getAsync: jest.fn(url => testAllCredentials),
  };
  return getApiV2Mock(merge(defaultCredentialsApiV2Mock, overridenMock));
}
export function getApiV2Mock(overridenMock: { [key: string]: any } = {}) {
  const defaultMock = {
    sessionSecret: 'test-session',
    getAsync: jest.fn(),
    postAsync: jest.fn(),
    putAsync: jest.fn(),
    deleteAsync: jest.fn(),
    uploadFormDataAsync: jest.fn(),
    _requestAsync: jest.fn(),
  };
  return merge(defaultMock, overridenMock);
}

export function getApiClientMock(overridenMock: { [key: string]: any } = {}) {
  // by default all method throw exceptions to make sure that we only what is expected
  const defaultMock = {
    getAllCredentialsApi: jest.fn(() => {
      throw new Error('unexpected call');
    }),
    getAllCredentialsForAppApi: jest.fn(() => {
      throw new Error('unexpected call');
    }),
    getUserCredentialsByIdApi: jest.fn(() => {
      throw new Error('unexpected call');
    }),
    createDistCertApi: jest.fn(() => {
      throw new Error('unexpected call');
    }),
    updateDistCertApi: jest.fn(() => {
      throw new Error('unexpected call');
    }),
    deleteDistCertApi: jest.fn(() => {
      throw new Error('unexpected call');
    }),
    useDistCertApi: jest.fn(() => {
      throw new Error('unexpected call');
    }),
    createPushKeyApi: jest.fn(() => {
      throw new Error('unexpected call');
    }),
    updatePushKeyApi: jest.fn(() => {
      throw new Error('unexpected call');
    }),
    deletePushKeyApi: jest.fn(() => {
      throw new Error('unexpected call');
    }),
    usePushKeyApi: jest.fn(() => {
      throw new Error('unexpected call');
    }),
    deletePushCertApi: jest.fn(() => {
      throw new Error('unexpected call');
    }),
    updateProvisioningProfileApi: jest.fn(() => {
      throw new Error('unexpected call');
    }),
    deleteProvisioningProfileApi: jest.fn(() => {
      throw new Error('unexpected call');
    }),
  };
  return merge(defaultMock, overridenMock);
}

export const testAppJson = {
  name: 'testing 123',
  version: '0.1.0',
  slug: testSlug,
  sdkVersion: '33.0.0',
  ios: { bundleIdentifier: testBundleIdentifier },
};
export const testAppJsonWithDifferentOwner = {
  ...testAppJson,
  owner: jester2.username,
};

export function getCtxMock(overridenMock: { [key: string]: any } = {}) {
  const defaultMock = {
    ios: {
      getDistCert: jest.fn(() => testDistCert),
      createDistCert: jest.fn(() => testIosDistCredential),
      useDistCert: jest.fn(),
      getPushKey: jest.fn(() => testPushKey),
      createPushKey: jest.fn(() => testIosPushCredential),
      usePushKey: jest.fn(),
      updateProvisioningProfile: jest.fn(),
      getAppCredentials: jest.fn(() => testAppCredentials),
      getProvisioningProfile: jest.fn(() => testProvisioningProfile),
      getAllCredentials: jest.fn(() => testAllCredentials),
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
    hasProjectContext: true,
    manifest: testAppJson,
  };
  return merge(defaultMock, overridenMock);
}
