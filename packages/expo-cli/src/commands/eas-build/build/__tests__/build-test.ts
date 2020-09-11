import merge from 'lodash/merge';
import { vol } from 'memfs';

import { mockExpoXDL } from '../../../../__tests__/mock-utils';
import { testProvisioningProfileBase64 } from '../../../../credentials/test-fixtures/mock-base64-data';
import { BuildCommandPlatform } from '../../types';
import buildAction from '../action';

const mockedUser = {
  username: 'jester',
};

const mockProjectUrl = 'http://fakeurl.com';
const mockPostAsync = jest.fn();
jest.mock('@expo/config', () => {
  const pkg = jest.requireActual('@expo/config');
  return {
    ...pkg,
    IOSConfig: {
      BundleIdenitifer: {
        setBundleIdentifierForPbxproj: jest.fn(),
        getBundleIdentifierFromPbxproj: jest.fn(),
        getBundleIdentifier: jest.fn(),
      },
      ProvisioningProfile: {
        setProvisioningProfileForPbxproj: jest.fn(),
      },
      Scheme: {
        getSchemesFromXcodeproj: jest.fn(),
      },
    },
  };
});
jest.mock('fs');
jest.mock('prompts');
jest.mock('../../../../projects', () => {
  return {
    ensureProjectExistsAsync: () => 'fakeProjectId',
  };
});
jest.mock('../../utils/git');
jest.mock('../../../../git');
jest.mock('../../../../uploads', () => ({
  UploadType: {},
  uploadAsync: () => mockProjectUrl,
}));
jest.mock('@expo/image-utils', () => ({
  generateImageAsync(input, { src }) {
    const fs = require('fs');
    return { source: fs.readFileSync(src) };
  },
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
    provisioningProfilePath: 'pprofile',
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
  content: Buffer.from(testProvisioningProfileBase64, 'base64'),
  base64: testProvisioningProfileBase64,
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
        scheme: 'testapp',
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
  vol.fromJSON(
    {
      'credentials.json': JSON.stringify(merge(credentialsJson, overrideConfig.credentialsJson)),
      'keystore.jks': overrideConfig.keystore ?? keystore.content,
      'eas.json': JSON.stringify(merge(easJson, overrideConfig.easJson)),
      'app.json': JSON.stringify(appJson),
      'package.json': JSON.stringify(packageJson),
      'node_modules/expo/package.json': '{ "version": "38.0.0" }',
      'cert.p12': cert.content,
      'android/app/build.gradle': 'apply from: "./eas-build.gradle"',
      'android/app/eas-build.gradle': '',
    },
    '/projectdir'
  );
  vol.writeFileSync('/projectdir/pprofile', pprofile.content);
}

beforeEach(() => {
  vol.reset();
  mockPostAsync.mockReset();
});

jest.setTimeout(30000);

describe('build command', () => {
  describe('android generic job', () => {
    it('should throw if project is not configured', async () => {
      expect.assertions(1);

      setupProjectConfig({});
      vol.unlinkSync('/projectdir/android/app/eas-build.gradle');

      try {
        await buildAction('/projectdir', {
          platform: BuildCommandPlatform.ANDROID,
          wait: false,
          profile: 'release',
        });
      } catch (e) {
        expect(e.message).toMatch(
          'Project is not configured. Please run "expo eas:build:init" first to configure the project'
        );
      }
    });
    it('should go through build process', async () => {
      const postArguments: any = {};
      mockPostAsync.mockImplementationOnce((url, body) => {
        postArguments.url = url;
        postArguments.body = body;
        return { buildId: 'fakeBuildId' };
      });
      setupProjectConfig({});
      await buildAction('/projectdir', {
        platform: BuildCommandPlatform.ANDROID,
        wait: false,
        profile: 'release',
      });
      expect(mockPostAsync).toBeCalledTimes(1);
      expect(postArguments?.url).toEqual('projects/fakeProjectId/builds');
      expect(postArguments?.body?.metadata).toMatchObject({
        workflow: 'generic',
        credentialsSource: 'local',
      });
      expect(postArguments?.body?.job).toEqual({
        platform: 'android',
        type: 'generic',
        projectUrl: mockProjectUrl,
        artifactPath: 'android/app/build/outputs/**/*.{apk,aab}',
        gradleCommand: ':app:bundleRelease',
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
      await buildAction('/projectdir', {
        platform: BuildCommandPlatform.IOS,
        wait: false,
        profile: 'release',
      });
      expect(mockPostAsync).toBeCalledTimes(1);
      expect(postArguments?.url).toEqual('projects/fakeProjectId/builds');
      expect(postArguments?.body?.metadata).toMatchObject({
        workflow: 'generic',
        credentialsSource: 'local',
      });
      expect(postArguments?.body?.job).toEqual({
        platform: 'ios',
        type: 'generic',
        projectUrl: mockProjectUrl,
        artifactPath: 'ios/build/App.ipa',
        scheme: 'testapp',
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
      mockPostAsync.mockReset();
      mockPostAsync.mockImplementationOnce((url, body) => {
        postArguments.push({ url, body });
        return { buildId: 'fakeAndroidBuildId' };
      });
      mockPostAsync.mockImplementationOnce((url, body) => {
        postArguments.push({ url, body });
        return { buildId: 'fakeIosBuildId' };
      });
      setupProjectConfig({});
      await buildAction('/projectdir', {
        platform: BuildCommandPlatform.ALL,
        wait: false,
        profile: 'release',
      });

      expect(mockPostAsync).toBeCalledTimes(2);

      expect(postArguments[0]?.url).toEqual('projects/fakeProjectId/builds');
      expect(postArguments[0]?.body?.metadata).toMatchObject({
        workflow: 'generic',
        credentialsSource: 'local',
      });
      expect(postArguments[0]?.body?.job).toMatchObject({
        platform: 'android',
        type: 'generic',
        projectUrl: mockProjectUrl,
        artifactPath: 'android/app/build/outputs/**/*.{apk,aab}',
        gradleCommand: ':app:bundleRelease',
        secrets: {
          keystore: {
            dataBase64: keystore.base64,
            keystorePassword: 'keystorePassword',
            keyAlias: 'keyAlias',
            keyPassword: 'keyPassword',
          },
        },
      });

      expect(postArguments[1]?.url).toEqual('projects/fakeProjectId/builds');
      expect(postArguments[1]?.body?.metadata).toMatchObject({
        workflow: 'generic',
        credentialsSource: 'local',
      });
      expect(postArguments[1]?.body?.job).toMatchObject({
        platform: 'ios',
        type: 'generic',
        projectUrl: mockProjectUrl,
        artifactPath: 'ios/build/App.ipa',
        scheme: 'testapp',
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
});
