import { vol } from 'memfs';
import IOSBuilder from '../ios/IOSBuilder';
import { BuilderOptions } from '../BaseBuilder.types';
import {
  getApiV2MockCredentials,
  jester,
  testAppJson,
} from '../../../credentials/test-fixtures/mocks';

jest.mock('fs');
jest.mock('ora', () =>
  jest.fn(() => {
    return {
      start: jest.fn(() => {
        return { stop: jest.fn(), succeed: jest.fn(), fail: jest.fn() };
      }),
    };
  })
);
jest.mock('@expo/plist', () => {
  const plistModule = jest.requireActual('@expo/plist');
  return {
    ...plistModule,
    parse: jest.fn(() => ({ ExpirationDate: new Date('Apr 30, 3000') })),
  };
});
jest.mock('../utils', () => {
  const utilsModule = jest.requireActual('../utils');
  return {
    ...utilsModule,
    checkIfSdkIsSupported: jest.fn(),
  };
});
jest.mock('commander', () => {
  const commander = jest.requireActual('commander');
  return {
    ...commander,
    nonInteractive: true,
  };
});

function getMockXDL() {
  const mockUser = jester;
  const mockApiV2 = getApiV2MockCredentials();
  const pkg = jest.requireActual('@expo/xdl');
  return {
    ...pkg,
    UserManager: {
      ...pkg.UserManager,
      ensureLoggedInAsync: jest.fn(() => mockUser),
      getCurrentUserAsync: jest.fn(() => mockUser),
      getCurrentUsernameAsync: jest.fn(() => mockUser),
    },
    ApiV2: {
      ...pkg.clientForUser,
      clientForUser: jest.fn(() => mockApiV2),
    },
    Project: {
      getBuildStatusAsync: jest.fn(() => ({ jobs: [] })),
      getLatestReleaseAsync: jest.fn(() => ({ publicationId: 'test-publication-id' })),
      findReusableBuildAsync: jest.fn(() => ({})),
      startBuildAsync: jest.fn(() => ({})),
    },
    IosCodeSigning: {
      validateProvisioningProfile: jest.fn(),
    },
    PKCS12Utils: {
      getP12CertFingerprint: jest.fn(),
    },
  };
}

describe('build ios', () => {
  const projectRoot = '/test-project';
  const packageJson = JSON.stringify(
    {
      name: 'testing123',
      version: '0.1.0',
      description: 'fake description',
      main: 'index.js',
    },
    null,
    2
  );
  const appJson = JSON.stringify(testAppJson);

  beforeAll(() => {
    vol.fromJSON({
      [projectRoot + '/package.json']: packageJson,
      [projectRoot + '/app.json']: appJson,
    });
  });

  afterAll(() => {
    vol.reset();
  });

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

  let mockXDL;
  beforeEach(() => {
    mockXDL = getMockXDL();
    jest.mock('@expo/xdl', () => mockXDL);
  });

  it('archive build: basic case', async () => {
    const projectRoot = '/test-project';

    const builderOptions: BuilderOptions = {
      type: 'archive',
      parent: { nonInteractive: true },
    };

    const iosBuilder = new IOSBuilder(projectRoot, builderOptions);
    await iosBuilder.command();

    // expect that we get the latest release and started build
    expect(mockXDL.Project.getLatestReleaseAsync.mock.calls.length).toBe(1);
    expect(mockXDL.Project.startBuildAsync.mock.calls.length).toBe(1);
  });
});
