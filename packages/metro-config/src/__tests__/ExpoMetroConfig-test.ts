import path from 'path';

import { getDefaultConfig, loadAsync } from '../ExpoMetroConfig';

const projectRoot = path.join(__dirname, '__fixtures__', 'hello-world');

const consoleError = console.error;

beforeEach(() => {
  delete process.env.EXPO_TARGET;
});
describe('getDefaultConfig', () => {
  afterAll(() => {
    console.error = consoleError;
  });
  it('loads default configuration', () => {
    expect(getDefaultConfig(projectRoot)).toEqual(
      expect.objectContaining({
        projectRoot,
        resolver: expect.objectContaining({
          sourceExts: expect.arrayContaining(['expo.ts', 'expo.tsx', 'expo.js', 'expo.jsx', 'jsx']),
        }),
      })
    );
  });

  it('loads default configuration for bare apps', () => {
    expect(getDefaultConfig(projectRoot, { target: 'bare' }).resolver.sourceExts).toEqual(
      expect.not.arrayContaining(['expo.js'])
    );
  });

  it('complains about an invalid target setting', () => {
    process.env.EXPO_TARGET = 'bare';
    expect(() =>
      // @ts-ignore incorrect `target` value passed on purpose
      getDefaultConfig(projectRoot, { target: 'blooper' })
    ).toThrowErrorMatchingSnapshot();
  });
  it('logs an error if the environment variable is used', () => {
    console.error = jest.fn();
    process.env.EXPO_TARGET = 'bare';
    getDefaultConfig(projectRoot, {});
    expect(console.error).toBeCalled();
  });
});

describe('loadAsync', () => {
  it('adds runtime options to the default configuration', async () => {
    const options = {
      maxWorkers: 10,
      resetCache: true,
      reporter: { update() {} },
      sourceExts: ['yml', 'toml', 'json'],
    };
    const config = await loadAsync(projectRoot, options);
    expect(config).toMatchObject({
      maxWorkers: options.maxWorkers,
      resetCache: options.resetCache,
      reporter: options.reporter,
      resolver: {
        sourceExts: options.sourceExts,
      },
    });
  });
});
