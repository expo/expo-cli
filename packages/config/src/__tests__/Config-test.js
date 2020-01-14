import { vol } from 'memfs';

import { getConfig, readConfigJson, serialize } from '../Config';

jest.mock('fs');
jest.mock('resolve-from');

describe('readConfigJson', () => {
  describe('sdkVersion', () => {
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

  describe('serializing', () => {
    it(`serializes item`, () => {
      expect(
        serialize({
          foo: 'bar',
          boo: true,
          inn: 200,
          then: [true, { foo: 'bar' }],
          fun: () => ({ time: ['val'] }),
          last: {
            bar: 'foo',
            kid: [2, 'yo'],
          },
        })
      ).toMatchSnapshot();
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
      expect(exp.description).toBe(pkg.description);
    });

    it(`can skip throwing when the app.json is missing and expo isn't installed`, () => {
      const { exp, pkg } = readConfigJson('/no-package', true, true);
      expect(exp.name).toBe(pkg.name);
      expect(exp.description).toBe(pkg.description);
    });

    it(`will throw if the app.json is missing`, () => {
      expect(() => readConfigJson('/no-config')).toThrow(/does not contain a valid app\.json/);
      // No config is required for new method
      expect(() => getConfig('/no-config', { mode: 'development' })).not.toThrow();
    });

    it(`will throw if the expo package is missing`, () => {
      expect(() => readConfigJson('/no-package', true)).toThrow(
        /Cannot determine which native SDK version your project uses/
      );
      expect(() =>
        getConfig('/no-package', { mode: 'development', skipSDKVersionRequirement: false })
      ).toThrow(/Cannot determine which native SDK version your project uses/);
    });
    it(`will throw if an invalid mode is used to get the config`, () => {
      expect(() => getConfig('/no-config', { mode: 'invalid' })).toThrow(/Invalid mode/);
    });
  });
});
