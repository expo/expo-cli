import { vol } from 'memfs';

import {
  getDependenciesFromBundledNativeModules,
  maybeFormatSdkVersion,
  upgradeAsync,
} from '../upgrade';

jest.mock('fs');
jest.mock('resolve-from');

describe('maybeFormatSdkVersion', () => {
  it(`returns null`, () => {
    expect(maybeFormatSdkVersion(null)).toBe(null);
  });
  it(`supports UNVERSIONED`, () => {
    expect(maybeFormatSdkVersion('UNVERSIONED')).toBe('UNVERSIONED');
  });
  it(`returns formatted version`, () => {
    expect(maybeFormatSdkVersion('2')).toBe('2.0.0');
    expect(maybeFormatSdkVersion('2.4')).toBe('2.4.0');
    expect(maybeFormatSdkVersion('2.0.0')).toBe('2.0.0');
  });
});

describe('getDependenciesFromBundledNativeModules', () => {
  const originalWarn = console.warn;
  beforeEach(() => {
    console.warn = jest.fn();
  });
  afterAll(() => {
    console.warn = originalWarn;
  });

  it(`warns when the target SDK versions aren't provided`, () => {
    console.warn = jest.fn();
    getDependenciesFromBundledNativeModules({
      projectDependencies: {},
      bundledNativeModules: {},
      sdkVersion: '3.0.0',
      workflow: 'bare',
      targetSdkVersion: null,
    });

    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  describe('priority', () => {
    const projectDependencies = { 'jest-expo': '1.0.0' };
    const bundledNativeModules = { 'jest-expo': '2.0.0' };
    const sdkVersion = '3.0.0';
    const targetSdkVersion = {
      expoReactNativeTag: 'mock-expoReactNativeTag',
      facebookReactVersion: 'mock-facebookReactVersion',
      facebookReactNativeVersion: 'mock-facebookReactNativeVersion',
      relatedPackages: {
        'jest-expo': '4.0.0',
      },
    };

    it(`upgrades jest-expo to bundledNativeModules when sdkVersion and targetSdkVersion aren't defined`, () => {
      const deps = getDependenciesFromBundledNativeModules({
        projectDependencies,
        bundledNativeModules,
        workflow: 'bare',
        targetSdkVersion: null,
      });
      expect(deps['jest-expo']).toBe('2.0.0');
    });

    it(`upgrades jest-expo to sdkVersion when targetSdkVersion is undefined`, () => {
      const deps = getDependenciesFromBundledNativeModules({
        projectDependencies,
        bundledNativeModules,
        sdkVersion,
        workflow: 'bare',
        targetSdkVersion: null,
      });
      expect(deps['jest-expo']).toBe('^3.0.0');
    });

    it(`upgrades jest-expo to targetSdkVersion.relatedPackages when everything is defined`, () => {
      const deps = getDependenciesFromBundledNativeModules({
        projectDependencies,
        bundledNativeModules,
        sdkVersion,
        workflow: 'bare',
        targetSdkVersion,
      });
      expect(deps['jest-expo']).toBe('4.0.0');
    });
  });

  describe('react-native', () => {
    const projectDependencies = { 'react-native': '1.0.0' };
    const bundledNativeModules = { 'react-native': '2.0.0' };
    const sdkVersion = '3.0.0';
    const targetSdkVersion = {
      expoReactNativeTag: 'mock-expoReactNativeTag',
      facebookReactVersion: 'mock-facebookReactVersion',
      facebookReactNativeVersion: 'mock-facebookReactNativeVersion',
      relatedPackages: {},
    };

    for (const workflow of ['bare', 'managed']) {
      it(`upgrades react-native to expo fork when expokit is installed, in ${workflow} workflow`, () => {
        const deps = getDependenciesFromBundledNativeModules({
          projectDependencies: { ...projectDependencies, expokit: 'mock-expokit' },
          bundledNativeModules,
          sdkVersion,
          workflow: workflow as any,
          targetSdkVersion,
        });
        expect(deps['react-native']).toBe(
          'https://github.com/expo/react-native/archive/mock-expoReactNativeTag.tar.gz'
        );
      });
    }

    it(`upgrades react-native to fb version in bare workflow`, () => {
      const deps = getDependenciesFromBundledNativeModules({
        projectDependencies: { ...projectDependencies },
        bundledNativeModules,
        sdkVersion,
        workflow: 'bare',
        targetSdkVersion,
      });
      expect(deps['react-native']).toBe('mock-facebookReactNativeVersion');
    });
  });

  it(`doesn't add a package if it's not already installed`, () => {
    // Test that react-dom isn't added to a project that doesn't already have react-dom
    const targetSdkVersion = {
      expoReactNativeTag: 'mock-expoReactNativeTag',
      facebookReactVersion: 'mock-facebookReactVersion',
      facebookReactNativeVersion: 'mock-facebookReactNativeVersion',
      relatedPackages: { 'react-dom': 'mock-react-dom-related' },
    };

    const deps = getDependenciesFromBundledNativeModules({
      projectDependencies: { react: 'mock-react' },
      bundledNativeModules: { 'react-dom': 'mock-react-dom' },
      sdkVersion: '100.0.0',
      workflow: 'bare',
      targetSdkVersion,
    });
    expect('react-dom' in deps).toBe(false);
  });
});

describe('upgradeAsync', () => {
  const originalWarn = console.warn;
  const originalLog = console.log;
  beforeEach(() => {
    console.warn = jest.fn();
    console.log = jest.fn();
  });
  afterAll(() => {
    console.warn = originalWarn;
    console.log = originalLog;
  });

  beforeEach(() => {
    jest.mock('commander', () => {
      return {
        nonInteractive: true,
      };
    });
    jest.mock('@expo/package-manager', () => {
      return {
        createForProject() {
          return {
            addAsync: jest.fn(),
            addDevAsync: jest.fn(),
          };
        },
      };
    });
    jest.mock('@expo/xdl', () => {
      const pkg = jest.requireActual('@expo/xdl');
      return {
        ...pkg,
        Project: {
          ...pkg.Project,
          startReactNativeServerAsync: jest.fn(),
          stopReactNativeServerAsync: jest.fn(),
        },
      };
    });
    jest.mock('@expo/config', () => {
      const config = jest.requireActual('@expo/config');
      return {
        ...config,
        resolveModule: (name, projectRoot) => {
          return {
            'expo/bundledNativeModules.json': `${projectRoot}/node_modules/expo/bundledNativeModules.json`,
          }[name];
        },
        writeConfigJsonAsync: jest.fn((...props) => {
          return config.writeConfigJsonAsync(...props);
        }),
      };
    });
  });

  afterEach(() => {
    jest.unmock('commander');
    jest.unmock('@expo/package-manager');
    jest.unmock('@expo/config');
    jest.unmock('@expo/xdl');
  });

  beforeAll(() => {
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

    const appJson = {
      name: 'testing 123',
      version: '0.1.0',
      slug: 'testing-123',
      sdkVersion: '33.0.0',
    };

    const expoPackageJson = JSON.stringify({
      name: 'expo',
      version: '35.0.0',
    });

    vol.fromJSON({
      '/from-app-json-UNVERSIONED/package.json': packageJson,
      '/from-app-json-UNVERSIONED/app.json': JSON.stringify({
        expo: { ...appJson, sdkVersion: 'UNVERSIONED' },
      }),
      '/from-app-json-UNVERSIONED/app.config.js': `module.exports=({config}) => ({ ...config, sdkVersion: '34.0.0' })`,
      '/from-app-json-UNVERSIONED/node_modules/expo/package.json': expoPackageJson,
      '/from-app-json-UNVERSIONED/node_modules/expo/bundledNativeModules.json': JSON.stringify({}),

      '/from-app-json/package.json': packageJson,
      '/from-app-json/app.json': JSON.stringify({ expo: { ...appJson } }),
      '/from-app-json/app.config.js': `module.exports=({config}) => ({ ...config, sdkVersion: '34.0.0' })`,
      '/from-app-json/node_modules/expo/package.json': expoPackageJson,
      '/from-app-json/node_modules/expo/bundledNativeModules.json': JSON.stringify({}),

      '/from-app-config-js/package.json': packageJson,
      '/from-app-config-js/app.json': JSON.stringify({
        expo: { ...appJson, sdkVersion: undefined },
      }),
      '/from-app-config-js/app.config.js': `module.exports=({config}) => ({ ...config, sdkVersion: '34.0.0' })`,
      '/from-app-config-js/node_modules/expo/package.json': expoPackageJson,
      '/from-app-config-js/node_modules/expo/bundledNativeModules.json': JSON.stringify({}),

      '/from-expo-package/package.json': packageJson,
      '/from-expo-package/app.json': JSON.stringify({
        expo: { ...appJson, sdkVersion: undefined },
      }),
      '/from-expo-package/app.config.js': `module.exports=({config}) => ({ ...config })`,
      '/from-expo-package/node_modules/expo/package.json': expoPackageJson,
      '/from-expo-package/node_modules/expo/bundledNativeModules.json': JSON.stringify({}),
    });
  });
  afterAll(() => {
    vol.reset();
  });

  // Ensure we delete the app.json sdkVersion if it's defined
  it(`delete the app.json sdkVersion if it's defined`, async () => {
    require('@expo/config').writeConfigJsonAsync = jest.fn((...props) => {
      return jest.requireActual('@expo/config').writeConfigJsonAsync(...props);
    });
    const projectRoot = '/from-app-json';
    await upgradeAsync(
      { projectRoot, workflow: 'bare', requestedSdkVersion: null },
      { yarn: true }
    );
    expect(require('@expo/config').writeConfigJsonAsync).toBeCalledTimes(1);
    expect(require('@expo/config').writeConfigJsonAsync).toHaveBeenLastCalledWith(projectRoot, {
      sdkVersion: undefined,
    });

    const { exp, rootConfig: json } = await require('@expo/config').readConfigJsonAsync(
      projectRoot
    );
    expect(json.expo.sdkVersion).not.toBeDefined();
    // Uses expo package version
    expect(exp.sdkVersion).toBe('35.0.0');
  }, 10000);

  // Important to ensure that we don't modify the app.json extraneously
  it(`skips modifying the app.json if the app.json doesn't define an sdkVersion`, async () => {
    require('@expo/config').writeConfigJsonAsync = jest.fn();
    const projectRoot = '/from-app-config-js';
    await upgradeAsync(
      { projectRoot, workflow: 'bare', requestedSdkVersion: null },
      { yarn: true }
    );
    expect(require('@expo/config').writeConfigJsonAsync).toBeCalledTimes(0);
  }, 10000);

  // Ensure we skip modifying an unversioned app.json
  // Skip for now because upgrade doesn't support UNVERSIONED
  xit(`skips modifying the app.json if the version is UNVERSIONED`, async () => {
    require('@expo/config').writeConfigJsonAsync = jest.fn();
    const projectRoot = '/from-app-json-UNVERSIONED';
    await upgradeAsync(
      { projectRoot, workflow: 'bare', requestedSdkVersion: null },
      { yarn: true }
    );
    expect(require('@expo/config').writeConfigJsonAsync).toBeCalledTimes(0);
  }, 10000);
});
