import { shouldUseDevServer } from '../Env';

describe(shouldUseDevServer, () => {
  beforeEach(() => {
    delete process.env.EXPO_USE_DEV_SERVER;
  });
  it(`defaults to true for projects without an SDK version`, () => {
    expect(shouldUseDevServer({ sdkVersion: 'UNVERSIONED' })).toBe(true);
    expect(shouldUseDevServer({ sdkVersion: undefined })).toBe(true);
    expect(shouldUseDevServer({})).toBe(true);
  });
  it(`is true for projects in SDK +40`, () => {
    expect(shouldUseDevServer({ sdkVersion: '40.0.0' })).toBe(true);
    expect(shouldUseDevServer({ sdkVersion: '41.0.0' })).toBe(true);
  });
  it(`is false for projects in SDK 39`, () => {
    expect(shouldUseDevServer({ sdkVersion: '39.0.0' })).toBe(false);
    expect(shouldUseDevServer({ sdkVersion: '10.0.0' })).toBe(false);
  });
  it(`uses the env variable`, () => {
    process.env.EXPO_USE_DEV_SERVER = String(true);
    expect(shouldUseDevServer({ sdkVersion: '10.0.0' })).toBe(true);
    expect(shouldUseDevServer({ sdkVersion: '41.0.0' })).toBe(true);
  });
});
