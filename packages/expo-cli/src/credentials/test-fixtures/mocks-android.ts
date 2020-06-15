import { User } from '@expo/xdl';
import merge from 'lodash/merge';
import { AndroidCredentials } from '../credentials';
import { testKeystore2Base64, testKeystoreBase64 } from './mock-keystore';

const today = new Date();
const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
export const testSlug = 'testApp';
export const testSlug2 = 'testApp2';
export const testExperienceName = `@jester/${testSlug}`;
export const testJester2ExperienceName = `@jester2/${testSlug}`;
export const testExperienceName2 = `@jester/${testSlug2}`;
export const testPackageName = 'test.com.app';

export const testKeystore = {
  keystore: testKeystoreBase64,
  keystorePassword: 'ae6777e9444a436dbe533d2be46c83ba',
  keyAlias: 'QHdrb3p5cmEvY3JlZGVudGlhbHMtdGVzdA==',
  keyPassword: '43f760fe7ecd4e6a925779eb45bc787b',
};
export const testKeystore2 = {
  keystore: testKeystore2Base64,
  keystorePassword: '6faeed2326b94effadbeb731510c2378',
  keyAlias: 'QHdrb3p5cmEvY3JlZGVudGlhbHMtdGVzdA==',
  keyPassword: 'e4829b38057042d78f25053f390478f9',
};

export const testPushCredentials = {
  fcmApiKey: 'examplefcmapikey',
};

export const testAppCredentials = {
  experienceName: testExperienceName,
  keystore: testKeystore,
  pushCredentials: testPushCredentials,
};

export const testJester2AppCredentials = {
  experienceName: testJester2ExperienceName,
  keystore: testKeystore2,
  pushCredentials: testPushCredentials,
};

export const testAllCredentials: { [key: string]: AndroidCredentials } = {
  [testExperienceName]: testAppCredentials,
  [testJester2ExperienceName]: testJester2AppCredentials,
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
    getAsync: jest.fn(path => {
      if (path.match(/^credentials\/android$/)) {
        return {
          credentials: [testAppCredentials],
        };
      }
      const match = path.match(/^credentials\/android\/(@[-a-zA-Z0-9]+\/[-a-zA-Z0-9]+)$/);
      if (match) {
        return testAllCredentials[match[1]];
      }
      return null;
    }),
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
export const testAppJson = {
  name: 'testing 123',
  version: '0.1.0',
  slug: testSlug,
  sdkVersion: '33.0.0',
  android: { package: testPackageName },
};
export const testAppJsonWithDifferentOwner = {
  ...testAppJson,
  owner: jester2.username,
};

export function getCtxMock(overridenMock: { [key: string]: any } = {}) {
  const defaultMock = {
    android: {
      fetchAll: jest.fn(),
      fetchKeystore: jest.fn(() => testKeystore),
      updateKeystore: jest.fn(),
      removeKeystore: jest.fn(),
    },
    ensureAppleCtx: jest.fn(),
    user: jest.fn(),
    hasAppleCtx: jest.fn(() => true),
    hasProjectContext: true,
    manifest: testAppJson,
    projectDir: '.',
  };
  return merge(defaultMock, overridenMock);
}
