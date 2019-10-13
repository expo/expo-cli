import { vol } from 'memfs';

import { readConfigJson } from '../Config';

jest.mock('fs');
jest.mock('resolve-from');

describe('readConfigJson', () => {
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
  it('reads the SDK version from the config', async () => {
    const { exp } = await readConfigJson('/from-config');
    expect(exp.sdkVersion).toBe('100.0.0');
  });

  it('reads the SDK version from the installed version of expo', async () => {
    const { exp } = await readConfigJson('/from-package');
    expect(exp.sdkVersion).toBe('650.0.0');
  });

  it('skips resolution of the SDK version', async () => {
    const { exp } = await readConfigJson('/no-version', true, true);
    expect(exp.sdkVersion).not.toBeDefined();
  });
  afterAll(() => {
    vol.reset();
  });
});
