import { vol } from 'memfs';

import {
  isInvalidReleaseChannel,
  logBareWorkflowWarnings,
  logExpoUpdatesWarnings,
  logOptimizeWarnings,
} from '../publish';

jest.mock('fs');

describe('isInvalidReleaseChannel', () => {
  it(`does not allow spaces, capitalized characters, or emojis`, () => {
    expect(isInvalidReleaseChannel('foo bar')).toBe(true);
    expect(isInvalidReleaseChannel('foo-Bar')).toBe(true);
    expect(isInvalidReleaseChannel('😁')).toBe(true);
  });
  it(`allows characters, numbers, and undefined`, () => {
    expect(isInvalidReleaseChannel()).toBe(false);
    expect(isInvalidReleaseChannel('123')).toBe(false);
    expect(isInvalidReleaseChannel('default')).toBe(false);
    expect(isInvalidReleaseChannel('foo-bar')).toBe(false);
  });
});

describe('warnings', () => {
  const originalWarn = console.warn;
  const originalLog = console.log;

  beforeAll(() => {
    vol.fromJSON({
      'optimized/.expo-shared/assets.json': JSON.stringify({}),
    });
  });

  beforeEach(() => {
    console.warn = jest.fn();
    console.log = jest.fn();
  });
  afterAll(() => {
    console.warn = originalWarn;
    console.log = originalLog;
    vol.reset();
  });
  it(`skips expo-updates warnings if expo-kit is not installed`, () => {
    logExpoUpdatesWarnings({ dependencies: { 'expo-updates': '1.0.0' } });
    expect(console.warn).toBeCalledTimes(0);
  });
  it(`warns about expo-updates not working in ExpoKit`, () => {
    logExpoUpdatesWarnings({ dependencies: { 'expo-updates': '1.0.0', expokit: '1.0.0' } });
    expect(console.warn).toBeCalledTimes(3);
  });

  it(`skips bare workflow warnings if expo is not installed in a bare project`, () => {
    logBareWorkflowWarnings({});
    expect(console.warn).toBeCalledTimes(0);
  });

  it(`warns about publishing in a bare workflow project when expo is installed`, () => {
    logBareWorkflowWarnings({ dependencies: { expo: '1.0.0' } });
    expect(console.warn).toBeCalledTimes(3);
  });

  it(`skips warning about assets if shared file exists`, () => {
    logOptimizeWarnings({ projectRoot: 'optimized' });

    expect(console.warn).toBeCalledTimes(0);
  });
  it(`warns about unoptimized assets when shared folder is missing`, () => {
    logOptimizeWarnings({ projectRoot: '/' });
    expect(console.warn).toBeCalledTimes(2);
  });
});
