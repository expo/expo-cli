import { vol } from 'memfs';
import IOSBuilder from '../ios/IOSBuilder';
import { BuilderOptions } from '../BaseBuilder.types';
import {
  getApiV2Mock,
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

const mockUser = jester;
const mockApiV2 = getApiV2MockCredentials();
const mockedXDLModules = {
  UserManager: {
    ensureLoggedInAsync: jest.fn(() => mockUser),
    getCurrentUserAsync: jest.fn(() => mockUser),
    getCurrentUsernameAsync: jest.fn(() => mockUser.username),
  },
  ApiV2: {
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
  PKCS12Utils: { getP12CertFingerprint: jest.fn(), findP12CertSerialNumber: jest.fn() },
};

jest.mock('@expo/xdl', () => {
  const pkg = jest.requireActual('@expo/xdl');
  const xdlMock = {
    ...pkg,
  };
  for (const xdlModuleName of Object.keys(mockedXDLModules)) {
    xdlMock[xdlModuleName] = {
      ...pkg[xdlModuleName],
      ...mockedXDLModules[xdlModuleName],
    };
  }
  return xdlMock;
});

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
  const originalError = console.error;
  beforeAll(() => {
    console.warn = jest.fn();
    console.log = jest.fn();
    console.error = jest.fn();
  });
  afterAll(() => {
    console.warn = originalWarn;
    console.log = originalLog;
    console.error = originalError;
  });

  afterEach(() => {
    const mockedXDLModuleObjects = Object.values(mockedXDLModules);
    for (const module of mockedXDLModuleObjects) {
      const xdlFunctions = Object.values(module);
      for (const xdlFunction of xdlFunctions) {
        xdlFunction.mockClear();
      }
    }
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
    expect(mockedXDLModules.Project.getLatestReleaseAsync.mock.calls.length).toBe(1);
    expect(mockedXDLModules.Project.startBuildAsync.mock.calls.length).toBe(1);
  });
  it('archive build: fails if user passes in incomplete credential flags', async () => {
    const projectRoot = '/test-project';

    const builderOptions: BuilderOptions = {
      type: 'archive',
      parent: { nonInteractive: true },
      pushId: 'sdf',
    };

    const iosBuilder = new IOSBuilder(projectRoot, builderOptions);

    await expect(iosBuilder.command()).rejects.toThrow();
    // fail if we proceed to get the latest release and started build
    expect(mockedXDLModules.Project.getLatestReleaseAsync.mock.calls.length).toBe(0);
    expect(mockedXDLModules.Project.startBuildAsync.mock.calls.length).toBe(0);
  });
  it('archive build: fails if user has no credentials', async () => {
    // Mock empty credentials call
    const apiV2Mock = getApiV2Mock({
      getAsync: jest.fn(() => ({ appCredentials: [], userCredentials: [] })),
    });
    mockedXDLModules.ApiV2.clientForUser.mockImplementationOnce(jest.fn(() => apiV2Mock));
    const projectRoot = '/test-project';

    const builderOptions: BuilderOptions = {
      type: 'archive',
      parent: { nonInteractive: true },
    };

    const iosBuilder = new IOSBuilder(projectRoot, builderOptions);
    await expect(iosBuilder.command()).rejects.toThrow();

    // fail if we proceed to get the latest release and started build
    expect(mockedXDLModules.Project.getLatestReleaseAsync.mock.calls.length).toBe(0);
    expect(mockedXDLModules.Project.startBuildAsync.mock.calls.length).toBe(0);
  });
  it('archive build: pass in all credentials from cli', async () => {
    const OLD_ENV = process.env;

    try {
      process.env = { ...OLD_ENV, EXPO_IOS_DIST_P12_PASSWORD: 'sdf' };

      // Mock empty credentials call
      const apiV2Mock = getApiV2Mock({
        getAsync: jest.fn(() => ({ appCredentials: [], userCredentials: [] })),
        postAsync: jest.fn((endpointPath: string, params: any) => {
          if (endpointPath === 'credentials/ios/dist' || endpointPath === 'credentials/ios/push') {
            return { ...params, id: 1 };
          }
        }),
      });
      mockedXDLModules.ApiV2.clientForUser.mockImplementationOnce(jest.fn(() => apiV2Mock));
      const projectRoot = '/test-project';

      const builderOptions: BuilderOptions = {
        type: 'archive',
        parent: { nonInteractive: true },
        teamId: 'sdf',
        distP12Path: projectRoot + '/package.json',
        pushP8Path: projectRoot + '/package.json',
        pushId: 'sdf',
        provisioningProfilePath: projectRoot + '/package.json',
      };

      const iosBuilder = new IOSBuilder(projectRoot, builderOptions);
      await iosBuilder.command();

      // expect that we get the latest release and started build
      expect(mockedXDLModules.Project.getLatestReleaseAsync.mock.calls.length).toBe(1);
      expect(mockedXDLModules.Project.startBuildAsync.mock.calls.length).toBe(1);
    } finally {
      process.env = { ...OLD_ENV };
    }
  });
});
