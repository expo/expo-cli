import path from 'path';

import {
  getHermesBytecodeBundleVersionAsync,
  isHermesBytecodeBundleAsync,
  parseGradleProperties,
} from '../HermesBundler';

describe('parseGradleProperties', () => {
  it('should return array of key-value tuple', () => {
    const content = `
    keyFoo=valueFoo
    keyBar=valueBar
    `;

    expect(parseGradleProperties(content)).toEqual({
      keyFoo: 'valueFoo',
      keyBar: 'valueBar',
    });
  });

  it('should keep "=" in value if there are multiple "="', () => {
    const content = `
    key=a=b=c
    `;

    expect(parseGradleProperties(content)).toEqual({
      key: 'a=b=c',
    });
  });

  it('should exclude comment', () => {
    const content = `
    # This is comment
      # comment with space prefix
    keyFoo=valueFoo
    `;

    expect(parseGradleProperties(content)).toEqual({
      keyFoo: 'valueFoo',
    });
  });
});

describe('getHermesBytecodeBundleVersionAsync', () => {
  it('should return hermes bytecode version 74 for plain.74.hbc', async () => {
    const file = path.join(__dirname, 'fixtures', 'plain.74.hbc');
    const result = await getHermesBytecodeBundleVersionAsync(file);
    expect(result).toBe(74);
  });

  it('should throw exception for plain javascript file', async () => {
    const file = path.join(__dirname, 'fixtures', 'plain.js');
    await expect(getHermesBytecodeBundleVersionAsync(file)).rejects.toThrow();
  });
});

describe('isHermesBytecodeBundleAsync', () => {
  it('should return true for hermes bytecode bundle file', async () => {
    const file = path.join(__dirname, 'fixtures', 'plain.74.hbc');
    const result = await isHermesBytecodeBundleAsync(file);
    expect(result).toBe(true);
  });

  it('should return false for plain javascript file', async () => {
    const file = path.join(__dirname, 'fixtures', 'plain.js');
    const result = await isHermesBytecodeBundleAsync(file);
    expect(result).toBe(false);
  });

  it('should throw exception for nonexistent file', async () => {
    const file = path.join(__dirname, 'fixtures', 'nonexistent.js');
    await expect(isHermesBytecodeBundleAsync(file)).rejects.toThrow();
  });
});

describe('maybeInconsistentEngineAsync - android', () => {
  let fs = require('fs-extra');
  let { maybeInconsistentEngineAsync } = require('../HermesBundler');

  beforeAll(() => {
    jest.resetModules();
    jest.doMock('fs-extra');
    fs = require('fs-extra');
    maybeInconsistentEngineAsync = require('../HermesBundler').maybeInconsistentEngineAsync;
  });
  afterAll(() => {
    jest.dontMock('fs-extra');
    jest.resetModules();
  });

  it('should return false for managed project', async () => {
    const mockFsExistSync = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>;
    mockFsExistSync.mockReturnValue(false);
    const result = await maybeInconsistentEngineAsync(
      '/expo',
      'android',
      /* isHermesManaged */ true
    );
    expect(result).toBe(false);
  });

  it('should return false if "enableHermes: true" in app/build.gradle and "jsEngine: \'hermes\'" in app.json', async () => {
    const appBuildGradlePath = '/expo/android/app/build.gradle';
    const mockFsExistSync = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>;
    mockFsExistSync.mockImplementation((file: string) => file === appBuildGradlePath);

    const mockFsReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
    const appBuildGradleTestCases = [
      `
project.ext.react = [
    enableHermes: true
]`,
      `
project.ext.react = [
    foo: 123,
    enableHermes: true
]`,
      `
project.ext.react = [
    foo: 123,
    enableHermes: true, // with comments
    bar: 123
]`,
    ];

    for (const content of appBuildGradleTestCases) {
      mockFsReadFile.mockImplementationOnce((file: string) => {
        return Promise.resolve(file === appBuildGradlePath ? content : '');
      });
      const result = await maybeInconsistentEngineAsync(
        '/expo',
        'android',
        /* isHermesManaged */ true
      );
      expect(result).toBe(false);
    }
  });

  it('should return true if "enableHermes: false" in app/build.gradle and "jsEngine: \'hermes\'" in app.json', async () => {
    const appBuildGradlePath = '/expo/android/app/build.gradle';
    const mockFsExistSync = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>;
    mockFsExistSync.mockImplementation((file: string) => file === appBuildGradlePath);

    const mockFsReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
    const appBuildGradleTestCases = [
      `
// empty build.gradle`,
      `
project.ext.react = [
]`,
      `
project.ext.react = [
    enableHermes: false
]`,
      `
project.ext.react = [
    foo: 123,
    enableHermes: false, // with comments
    bar: 123
]`,
    ];

    for (const content of appBuildGradleTestCases) {
      mockFsReadFile.mockImplementationOnce((file: string) => {
        return Promise.resolve(file === appBuildGradlePath ? content : '');
      });
      const result = await maybeInconsistentEngineAsync(
        '/expo',
        'android',
        /* isHermesManaged */ true
      );
      expect(result).toBe(true);
    }
  });

  it('should return false if "expo.jsEngine=hermes" in gradle.properties and "jsEngine: \'hermes\'" in app.json', async () => {
    const gradlePropertiesPath = '/expo/android/gradle.properties';
    const mockFsExistSync = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>;
    mockFsExistSync.mockImplementation((file: string) => file === gradlePropertiesPath);

    const mockFsReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
    mockFsReadFile.mockImplementation((file: string) => {
      return Promise.resolve(file === gradlePropertiesPath ? 'expo.jsEngine=hermes' : '');
    });

    const result = await maybeInconsistentEngineAsync(
      '/expo',
      'android',
      /* isHermesManaged */ true
    );
    expect(result).toBe(false);
  });

  it('should return false for default sdk41 bare project', async () => {
    const appBuildGradlePath = '/expo/android/app/build.gradle';
    const mockFsExistSync = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>;
    mockFsExistSync.mockImplementation((file: string) => file === appBuildGradlePath);

    const appBuildGradleContent = `
project.ext.react = [
    enableHermes: false
]`;

    const mockFsReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
    mockFsReadFile.mockImplementation((file: string) => {
      return Promise.resolve(file === appBuildGradlePath ? appBuildGradleContent : '');
    });

    const result = await maybeInconsistentEngineAsync(
      '/expo',
      'android',
      /* isHermesManaged */ false
    );
    expect(result).toBe(false);
  });

  it('should return true for default sdk41 bare project but user enabled hermes manually', async () => {
    const appBuildGradlePath = '/expo/android/app/build.gradle';
    const mockFsExistSync = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>;
    mockFsExistSync.mockImplementation((file: string) => file === appBuildGradlePath);

    const appBuildGradleContent = `
project.ext.react = [
    enableHermes: true
]`;

    const mockFsReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
    mockFsReadFile.mockImplementation((file: string) => {
      return Promise.resolve(file === appBuildGradlePath ? appBuildGradleContent : '');
    });

    const result = await maybeInconsistentEngineAsync(
      '/expo',
      'android',
      /* isHermesManaged */ false
    );
    expect(result).toBe(true);
  });

  it('should handle the inconsistency between app/build.gradle and gradle.properties', async () => {
    const appBuildGradlePath = '/expo/android/app/build.gradle';
    const gradlePropertiesPath = '/expo/android/gradle.properties';
    const mockFsExistSync = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>;
    mockFsExistSync.mockImplementation(
      (file: string) => file === appBuildGradlePath || file === gradlePropertiesPath
    );

    const mockFsReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
    const appBuildGradleContent = `
project.ext.react = [
    enableHermes: false
]`;
    const gradlePropertiesContent = `
expo.jsEngine=hermes
`;

    mockFsReadFile.mockImplementation((file: string) => {
      if (file === appBuildGradlePath) {
        return Promise.resolve(appBuildGradleContent);
      }
      if (file === gradlePropertiesPath) {
        return Promise.resolve(gradlePropertiesContent);
      }
      return Promise.reject(new Error('File not found.'));
    });

    const result = await maybeInconsistentEngineAsync(
      '/expo',
      'android',
      /* isHermesManaged */ true
    );
    expect(result).toBe(true);
  });
});
