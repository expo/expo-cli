jest.mock('fs');

const fs = require('fs');
const mockfs = require('mock-fs');

import * as Exp from '../Exp';

describe('determineEntryPointAsync', () => {
  beforeEach(() => {
    const packageJson = JSON.stringify(
      {
        name: 'testing123',
        version: '0.1.0',
        main: 'index.js',
      },
      null,
      2
    );

    const packageJsonAndroid = JSON.stringify(
      {
        name: 'testing123android',
        version: '0.1.0',
        main: 'index.android.js',
      },
      null,
      2
    );

    const packageJsonIos = JSON.stringify(
      {
        name: 'testing123ios',
        version: '0.1.0',
        main: 'index.ios.js',
      },
      null,
      2
    );

    const packageJsonNoMain = JSON.stringify({
      name: 'testing456',
      version: '0.2.0',
    });

    const expJson = JSON.stringify(
      {
        name: 'testing 123',
        version: '0.1.0',
        slug: 'testing-123',
      },
      null,
      2
    );

    const expJsonWithEntry = JSON.stringify({
      name: 'testing567',
      version: '0.6.0',
      entryPoint: 'main.js',
    });

    fs.__configureFs({
      '/exists-no-platform/package.json': packageJson,
      '/exists-no-platform/exp.json': expJson,
      '/exists-no-platform/index.js': 'console.log("lol")',

      '/exists-no-platform-no-main/package.json': packageJsonNoMain,
      '/exists-no-platform-no-main/exp.json': expJson,
      '/exists-no-platform-no-main/index.js': 'console.log("lol")',

      '/exists-android/package.json': packageJsonAndroid,
      '/exists-android/exp.json': expJson,
      '/exists-android/index.android.js': 'console.log("lol")',

      '/exists-ios/package.json': packageJsonIos,
      '/exists-ios/exp.json': expJson,
      '/exists-ios/index.ios.js': 'console.log("lol")',

      '/exists-expjson/package.json': packageJson,
      '/exists-expjson/exp.json': expJsonWithEntry,
      '/exists-expjson/main.js': 'console.log("lol")',
    });
  });

  afterEach(() => {
    mockfs.restore();
  });

  it('exists-no-platform', async () => {
    const entryPoint = await Exp.determineEntryPointAsync(
      '/exists-no-platform'
    );
    expect(entryPoint).toBe('index.js');
  });

  it('exists-no-platform-no-main', async () => {
    const entryPoint = await Exp.determineEntryPointAsync(
      '/exists-no-platform-no-main'
    );
    expect(entryPoint).toBe('index.js');
  });

  it('exists-android', async () => {
    const entryPoint = await Exp.determineEntryPointAsync('/exists-android');
    expect(entryPoint).toBe('index.android.js');
  });

  it('exists-ios', async () => {
    const entryPoint = await Exp.determineEntryPointAsync('/exists-ios');
    expect(entryPoint).toBe('index.ios.js');
  });

  it('exists-expjson', async () => {
    const entryPoint = await Exp.determineEntryPointAsync('/exists-expjson');
    expect(entryPoint).toBe('main.js');
  });
});
