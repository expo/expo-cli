import { vol } from 'memfs';

import log from '../../log';
import {
  isInvalidReleaseChannel,
  logBareWorkflowWarnings,
  logExpoUpdatesWarnings,
  logOptimizeWarnings,
} from '../publish';

jest.mock('fs');
jest.mock('../../log', () => ({
  nestedWarn: jest.fn(),
  chalk: { underline: jest.fn() },
}));

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
  beforeAll(() => {
    vol.fromJSON({
      'optimized/.expo-shared/assets.json': JSON.stringify({}),
    });
  });

  afterAll(() => {
    vol.reset();
  });
  it(`skips expo-updates warnings if expo-kit is not installed`, () => {
    (log.nestedWarn as jest.Mock).mockReset();
    logExpoUpdatesWarnings({ dependencies: { 'expo-updates': '1.0.0' } });
    expect(log.nestedWarn).toBeCalledTimes(0);
  });
  it(`warns about expo-updates not working in ExpoKit`, () => {
    (log.nestedWarn as jest.Mock).mockReset();
    logExpoUpdatesWarnings({ dependencies: { 'expo-updates': '1.0.0', expokit: '1.0.0' } });
    expect(log.nestedWarn).toBeCalledTimes(1);
  });

  it(`skips bare workflow warnings if expo is not installed in a bare project`, () => {
    (log.nestedWarn as jest.Mock).mockReset();
    logBareWorkflowWarnings({});
    expect(log.nestedWarn).toBeCalledTimes(0);
  });

  it(`warns about publishing in a bare workflow project when expo is installed`, () => {
    (log.nestedWarn as jest.Mock).mockReset();
    logBareWorkflowWarnings({ dependencies: { expo: '1.0.0' } });
    expect(log.nestedWarn).toBeCalledTimes(1);
  });

  it(`skips warning about assets if shared file exists`, () => {
    (log.nestedWarn as jest.Mock).mockReset();
    logOptimizeWarnings({ projectRoot: 'optimized' });
    expect(log.nestedWarn).toBeCalledTimes(0);
  });
  it(`warns about unoptimized assets when shared folder is missing`, () => {
    (log.nestedWarn as jest.Mock).mockReset();
    logOptimizeWarnings({ projectRoot: '/' });
    expect(log.nestedWarn).toBeCalledTimes(1);
  });
});
