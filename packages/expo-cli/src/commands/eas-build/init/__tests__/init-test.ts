import merge from 'lodash/merge';
import { vol } from 'memfs';

import { mockExpoXDL } from '../../../../__tests__/mock-utils';
import { testProvisioningProfileBase64 } from '../../../../credentials/test-fixtures/mock-base64-data';
import initAction from '../action';

const mockedUser = {
  username: 'jester',
};

jest.mock('fs');
jest.mock('../../../../projects', () => {
  return {
    ensureProjectExistsAsync: () => 'fakeProjectId',
  };
});
jest.mock('../../utils/git');
jest.mock('../../build/builders/iOSBuilder');
jest.mock('../../../../git');
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
      postAsync: jest.fn(),
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
      'app.json': JSON.stringify(appJson),
      'package.json': JSON.stringify(packageJson),
      'node_modules/expo/package.json': '{ "version": "38.0.0" }',
      'cert.p12': cert.content,
      'android/app/build.gradle': '',
    },
    '/projectdir'
  );
  vol.writeFileSync('/projectdir/pprofile', pprofile.content);
}

beforeEach(() => {
  vol.reset();
});

jest.setTimeout(30000);

describe('init command', () => {
  it('should configure android project', async () => {
    setupProjectConfig({});
    await initAction('/projectdir', {});
    expect(vol.existsSync('/projectdir/eas.json')).toBe(true);
    expect(vol.existsSync('/projectdir/android/app/eas-build.gradle')).toBe(true);
    expect(vol.readFileSync('/projectdir/android/app/build.gradle', 'utf-8')).toContain(
      'apply from: "./eas-build.gradle"'
    );
  });
});
