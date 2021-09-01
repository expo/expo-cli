import fs from 'fs';
import pick from 'lodash/pick';
import { vol } from 'memfs';
import path from 'path';

import { getAppBuildGradleAsync, parseGradleCommand, resolveConfigValue } from '../BuildGradle';

const fsReal = jest.requireActual('fs') as typeof fs;

jest.mock('fs');

describe(getAppBuildGradleAsync, () => {
  afterEach(async () => {
    vol.reset();
  });

  test('parsing build.gradle from managed template', async () => {
    vol.fromJSON(
      {
        'android/app/build.gradle': fsReal.readFileSync(
          path.join(__dirname, 'fixtures/android/app/build.gradle'),
          'utf-8'
        ),
      },
      '/test'
    );
    const buildGradle = await getAppBuildGradleAsync('/test');
    expect(
      pick(buildGradle?.android ?? {}, ['defaultConfig', 'flavorDimensions', 'productFlavors'])
    ).toEqual({
      defaultConfig: {
        applicationId: 'com.helloworld',
        minSdkVersion: 'rootProject.ext.minSdkVersion',
        targetSdkVersion: 'rootProject.ext.targetSdkVersion',
        versionCode: '1',
        versionName: '1.0',
      },
    });
  });

  test('parsing multiflavor build.gradle', async () => {
    vol.fromJSON(
      {
        'android/app/build.gradle': fsReal.readFileSync(
          path.join(__dirname, 'fixtures/android/app/multiflavor-build.gradle'),
          'utf-8'
        ),
      },
      '/test'
    );
    const buildGradle = await getAppBuildGradleAsync('/test');
    expect(
      pick(buildGradle?.android ?? {}, ['defaultConfig', 'flavorDimensions', 'productFlavors'])
    ).toEqual({
      defaultConfig: {
        applicationId: 'com.testapp',
        minSdkVersion: 'rootProject.ext.minSdkVersion',
        targetSdkVersion: 'rootProject.ext.targetSdkVersion',
        versionCode: '1',
        versionName: '1.0',
      },
      productFlavors: {
        abc: {
          applicationId: 'wefewf.wefew.abc',
          versionCode: '123',
        },
        efg: {
          applicationId: 'wefewf.wefew.efg',
          versionCode: '124',
        },
      },
    });
  });

  test('parsing build.gradle with flavor dimensions', async () => {
    vol.fromJSON(
      {
        'android/app/build.gradle': fsReal.readFileSync(
          path.join(__dirname, 'fixtures/android/app/multiflavor-with-dimensions-build.gradle'),
          'utf-8'
        ),
      },
      '/test'
    );
    const buildGradle = await getAppBuildGradleAsync('/test');
    expect(
      pick(buildGradle?.android ?? {}, ['defaultConfig', 'flavorDimensions', 'productFlavors'])
    ).toEqual({
      defaultConfig: {
        applicationId: 'com.testapp',
        minSdkVersion: 'rootProject.ext.minSdkVersion',
        targetSdkVersion: 'rootProject.ext.targetSdkVersion',
        versionCode: '1',
        versionName: '1.0',
      },
      flavorDimensions: '"api", "mode"',
      productFlavors: {
        abc: {
          applicationId: 'wefewf.wefew.abc',
          versionCode: '123',
          dimension: 'api',
        },
        efg: {
          applicationId: 'wefewf.wefew.efg',
          versionCode: '124',
          dimension: 'mode',
        },
      },
    });
  });
});

describe(parseGradleCommand, () => {
  test('parsing :app:bundleRelease', async () => {
    const result = parseGradleCommand(':app:bundleRelease', {});
    expect(result).toEqual({ moduleName: 'app', buildType: 'release' });
  });
  test('parsing :app:buildExampleDebug', async () => {
    const result = parseGradleCommand(':app:buildExampleRelease', {
      android: { productFlavors: { example: {} } },
    });
    expect(result).toEqual({ moduleName: 'app', flavor: 'example', buildType: 'release' });
  });
  test('parsing :app:buildExampleDebug when flavor is named with uper-case', async () => {
    const result = parseGradleCommand(':app:buildExampleRelease', {
      android: { productFlavors: { Example: {} } },
    });
    expect(result).toEqual({ moduleName: 'app', flavor: 'Example', buildType: 'release' });
  });
  test('parsing :app:buildExampleDebug when flavor does not exists', async () => {
    const result = () => {
      parseGradleCommand(':app:buildExampleRelease', {
        android: { productFlavors: {} },
      });
    };
    expect(result).toThrow('flavor example is not defined');
  });
  test('parsing with aditional cmdline options', async () => {
    const result = parseGradleCommand(':app:bundleRelease --console verbose', {});
    expect(result).toEqual({ moduleName: 'app', buildType: 'release' });
  });
  test('parsing without module name specified', async () => {
    const result = parseGradleCommand('bundleRelease --console verbose', {});
    expect(result).toEqual({ buildType: 'release' });
  });
});

describe(resolveConfigValue, () => {
  it('get versionCode for default flavor', async () => {
    const buildGradle = {
      android: {
        defaultConfig: { versionCode: '123' },
        productFlavors: { example: { versionCode: '1234' } },
      },
    };
    const result = resolveConfigValue(buildGradle, undefined, 'versionCode');
    expect(result).toEqual('123');
  });
  it('get versionCode for example flavor', async () => {
    const buildGradle = {
      android: {
        defaultConfig: { versionCode: '123' },
        productFlavors: { example: { versionCode: '1234' } },
      },
    };
    const result = resolveConfigValue(buildGradle, 'example', 'versionCode');
    expect(result).toEqual('1234');
  });
  it('get versionCode for example flavor from default config', async () => {
    const buildGradle = {
      android: {
        defaultConfig: { versionCode: '123' },
        productFlavors: { example: { versionName: '1234' } },
      },
    };
    const result = resolveConfigValue(buildGradle, 'example', 'versionCode');
    expect(result).toEqual('123');
  });
  it('get versionCode for example flavor from default config', async () => {
    const buildGradle = {
      android: {
        defaultConfig: { versionCode: '123' },
        productFlavors: { example: { versionName: '1234' } },
      },
    };
    const result = resolveConfigValue(buildGradle, 'example', 'versionCode');
    expect(result).toEqual('123');
  });
});
