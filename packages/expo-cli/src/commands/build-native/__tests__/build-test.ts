import { vol } from 'memfs';
import merge from 'lodash/merge';
import { User } from '@expo/xdl';

import { buildAction } from '../index';
import { mockExpoXDL } from '../../../__tests__/mock-utils';

const mockedUser = {
  username: 'jester',
};

const originalWarn = console.warn;
const originalLog = console.log;
beforeAll(() => {
  console.warn = jest.fn();
  console.log = jest.fn();
});
afterAll(() => {
  console.warn = originalWarn;
  console.log = originalLog;
});

const mockProjectUrl = 'http://fakeurl.com';
const mockPostAsync = jest.fn();
jest.mock('fs');
jest.mock('prompts');
jest.mock('../../../projects', () => {
  return {
    ensureProjectExistsAsync: () => 'fakeProjectId',
  };
});
jest.mock('../utils');
jest.mock('../../../uploads', () => ({
  UploadType: {},
  uploadAsync: () => mockProjectUrl,
}));

const mockedXDLModules = {
  UserManager: {
    ensureLoggedInAsync: jest.fn(() => mockedUser),
    getCurrentUserAsync: jest.fn(() => mockedUser),
  },
  ApiV2: {
    clientForUser: jest.fn(() => ({
      getAsync: url => {
        if (url === 'credentials/ios') {
          return { appCredentials: [], userCredentials: [] };
        }
      },
      postAsync: mockPostAsync,
    })),
  },
};
mockExpoXDL(mockedXDLModules);

const credentialsJson = {
  android: {
    keystore: {
      keystorePath: 'keystore.jks',
      keystorePassword: 'keystorePassword',
      keyAlias: 'keyAlias',
      keyPassword: 'keyPassword',
    },
  },
  ios: {
    provisioningProfilePath: './pprofile',
    distributionCertificate: {
      path: 'cert.p12',
      password: 'certPass',
    },
  },
};

const keystore = {
  content: 'somebinarycontent',
  base64: 'c29tZWJpbmFyeWNvbnRlbnQ=',
};

const pprofile = {
  content: 'pprofilecontent',
  base64: 'cHByb2ZpbGVjb250ZW50',
};

const cert = {
  content: 'certp12content',
  base64: 'Y2VydHAxMmNvbnRlbnQ=',
};

const easJson = {
  builds: {
    android: {
      release: {
        workflow: 'generic',
        credentialsSource: 'local',
      },
    },
    ios: {
      release: {
        workflow: 'generic',
        credentialsSource: 'local',
      },
    },
  },
};

const appJson = {
  expo: {
    ios: {
      bundleIdentifier: 'example.bundle.identifier',
    },
  },
};

const packageJson = {
  name: 'examplepackage',
};

function setupProjectConfig(overrideConfig: any) {
  vol.fromJSON({
    './credentials.json': JSON.stringify(merge(credentialsJson, overrideConfig.credentialsJson)),
    './keystore.jks': overrideConfig.keystore ?? keystore.content,
    './eas.json': JSON.stringify(merge(easJson, overrideConfig.easJson)),
    './app.json': JSON.stringify(appJson),
    './package.json': JSON.stringify(packageJson),
    './node_modules/expo/package.json': '{ "version": "38.0.0" }',
    './pprofile': pprofile.content,
    './cert.p12': cert.content,
  });
}

beforeEach(() => {
  vol.reset();
  mockPostAsync.mockReset();
});

describe('build command', () => {
  describe('android generic job', () => {
    it('should go through build process', async () => {
      const postArguments: any = {};
      mockPostAsync.mockImplementationOnce((url, body) => {
        postArguments.url = url;
        postArguments.body = body;
        return { buildId: 'fakeBuildId' };
      });
      setupProjectConfig({});
      await buildAction('.', {
        platform: 'android',
        wait: false,
        profile: 'release',
      });
      expect(postArguments?.url).toEqual('projects/fakeProjectId/builds');
      expect(postArguments?.body?.job).toEqual({
        platform: 'android',
        type: 'generic',
        projectUrl: mockProjectUrl,
        artifactPath: 'android/app/build/outputs/apk/release/app-release.apk',
        gradleCommand: ':app:assembleRelease',
        secrets: {
          keystore: {
            dataBase64: keystore.base64,
            keystorePassword: 'keystorePassword',
            keyAlias: 'keyAlias',
            keyPassword: 'keyPassword',
          },
        },
      });
    });
  });
  describe('ios generic job', () => {
    it('should go through build process', async () => {
      const postArguments: any = {};
      mockPostAsync.mockImplementationOnce((url, body) => {
        postArguments.url = url;
        postArguments.body = body;
        return { buildId: 'fakeBuildId' };
      });
      setupProjectConfig({});
      await buildAction('.', {
        platform: 'ios',
        wait: false,
        profile: 'release',
      });
      expect(postArguments?.url).toEqual('projects/fakeProjectId/builds');
      expect(postArguments?.body?.job).toEqual({
        platform: 'ios',
        type: 'generic',
        projectUrl: mockProjectUrl,
        secrets: {
          distributionCertificate: {
            dataBase64: cert.base64,
            password: 'certPass',
          },
          provisioningProfileBase64: pprofile.base64,
        },
      });
    });
  });
  describe('both platforms generic job', () => {
    it('should go through build process', async () => {
      const postArguments: any[] = [];
      mockPostAsync.mockImplementationOnce((url, body) => {
        postArguments.push({ url, body });
        return { buildId: 'fakeAndroidBuildId' };
      });
      mockPostAsync.mockImplementationOnce((url, body) => {
        postArguments.push({ url, body });
        return { buildId: 'fakeIosBuildId' };
      });
      setupProjectConfig({});
      await buildAction('.', {
        platform: 'all',
        wait: false,
        profile: 'release',
      });

      expect(postArguments).toEqual(
        expect.arrayContaining([
          {
            url: 'projects/fakeProjectId/builds',
            body: {
              job: {
                platform: 'android',
                type: 'generic',
                projectUrl: mockProjectUrl,
                artifactPath: 'android/app/build/outputs/apk/release/app-release.apk',
                gradleCommand: ':app:assembleRelease',
                secrets: {
                  keystore: {
                    dataBase64: keystore.base64,
                    keystorePassword: 'keystorePassword',
                    keyAlias: 'keyAlias',
                    keyPassword: 'keyPassword',
                  },
                },
              },
            },
          },
          {
            url: 'projects/fakeProjectId/builds',
            body: {
              job: {
                platform: 'ios',
                type: 'generic',
                projectUrl: mockProjectUrl,
                secrets: {
                  distributionCertificate: {
                    dataBase64: cert.base64,
                    password: 'certPass',
                  },
                  provisioningProfileBase64: pprofile.base64,
                },
              },
            },
          },
        ])
      );
    });
  });
});
