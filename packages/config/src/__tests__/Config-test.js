import { vol } from 'memfs';

import { readConfigJson, getWebOutputPath } from '../Config';

jest.mock('fs');
jest.mock('resolve-from');

describe('getWebOutputPath', () => {
  beforeAll(() => {
    const packageJson = JSON.stringify(
      {
        name: 'testing123',
        version: '0.1.0',
        main: 'index.js',
      },
      null,
      2
    );

    const appJson = {
      name: 'testing 123',
      version: '0.1.0',
      slug: 'testing-123',
      sdkVersion: '100.0.0',
    };

    vol.fromJSON({
      '/standard/package.json': JSON.stringify(packageJson),
      '/standard/app.json': JSON.stringify({ expo: appJson }),
      '/custom/package.json': JSON.stringify(packageJson),
      '/custom/app.json': JSON.stringify({
        expo: { ...appJson, web: { build: { output: 'defined-in-config' } } },
      }),
    });
  });
  afterAll(() => vol.reset());

  it('uses the default output build path for web', () => {
    const { exp } = readConfigJson('/standard');
    const outputPath = getWebOutputPath(exp);
    expect(outputPath).toBe('web-build');
  });

  it('uses a custom output build path from the config', () => {
    const { exp } = readConfigJson('/custom');
    const outputPath = getWebOutputPath(exp);
    expect(outputPath).toBe('defined-in-config');
  });

  beforeEach(() => {
    delete process.env.WEBPACK_BUILD_OUTPUT_PATH;
  });
  it('uses an env variable for the web build path', () => {
    process.env.WEBPACK_BUILD_OUTPUT_PATH = 'custom-env-path';

    for (const project of ['/custom', '/standard']) {
      const { exp } = readConfigJson(project);
      const outputPath = getWebOutputPath(exp);
      expect(outputPath).toBe('custom-env-path');
    }
  });
});

describe('readConfigJson', () => {
  describe('sdkVersion', () => {
    beforeAll(() => {
      const packageJson = JSON.stringify(
        {
          name: 'testing123',
          version: '0.1.0',
          main: 'index.js',
        },
        null,
        2
      );

      const appJson = {
        name: 'testing 123',
        version: '0.1.0',
        slug: 'testing-123',
        sdkVersion: '100.0.0',
      };

      const expoPackageJson = JSON.stringify({
        name: 'expo',
        version: '650.x.x',
      });

      vol.fromJSON({
        '/from-config/package.json': packageJson,
        '/from-config/app.json': JSON.stringify({ expo: appJson }),
        '/from-config/node_modules/expo/package.json': expoPackageJson,

        '/from-package/package.json': packageJson,
        '/from-package/app.json': JSON.stringify({ expo: { ...appJson, sdkVersion: undefined } }),
        '/from-package/node_modules/expo/package.json': expoPackageJson,

        '/no-version/package.json': packageJson,
        '/no-version/app.json': JSON.stringify({ expo: { ...appJson, sdkVersion: undefined } }),
      });
    });
    afterAll(() => vol.reset());

    it('reads the SDK version from the config', () => {
      const { exp } = readConfigJson('/from-config');
      expect(exp.sdkVersion).toBe('100.0.0');
    });

    it('reads the SDK version from the installed version of expo', () => {
      const { exp } = readConfigJson('/from-package');
      expect(exp.sdkVersion).toBe('650.0.0');
    });

    it('skips resolution of the SDK version', () => {
      const { exp } = readConfigJson('/no-version', true, true);
      expect(exp.sdkVersion).not.toBeDefined();
    });
  });

  describe('validation', () => {
    beforeAll(() => {
      const packageJson = JSON.stringify({
        name: 'testing123',
        version: '0.1.0',
        main: 'index.js',
      });

      const expoPackageJson = JSON.stringify({
        name: 'expo',
        version: '650.x.x',
      });

      vol.fromJSON({
        '/no-config/package.json': packageJson,
        '/no-config/node_modules/expo/package.json': expoPackageJson,

        '/no-package/package.json': packageJson,
      });
    });
    afterAll(() => vol.reset());

    it(`can skip throwing when the app.json is missing`, () => {
      const { exp, pkg } = readConfigJson('/no-config', true);
      expect(exp.name).toBe(pkg.name);
    });

    it(`can skip throwing when the app.json is missing and expo isn't installed`, () => {
      const { exp, pkg } = readConfigJson('/no-package', true, true);
      expect(exp.name).toBe(pkg.name);
    });

    it(`will throw if the app.json is missing`, () => {
      expect(() => readConfigJson('/no-config')).toThrow(/app.json must include a JSON object./);
    });

    it(`will throw if the expo package is missing`, () => {
      expect(() => readConfigJson('/no-package', true)).toThrow(
        /Cannot determine which native SDK version your project uses/
      );
    });
  });
});
