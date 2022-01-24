import { shouldUseDevServer } from '../Env';

describe(shouldUseDevServer, () => {
  beforeEach(() => {
    delete process.env.EXPO_USE_DEV_SERVER;
  });
  it(`defaults to true for projects without an SDK version`, () => {
    expect(shouldUseDevServer('UNVERSIONED')).toBe(true);
    expect(shouldUseDevServer(undefined)).toBe(true);
  });
  it(`is true for projects in SDK +40`, () => {
    expect(shouldUseDevServer('40.0.0')).toBe(true);
    expect(shouldUseDevServer('41.0.0')).toBe(true);
  });
  it(`is false for projects in SDK 39`, () => {
    expect(shouldUseDevServer('39.0.0')).toBe(false);
    expect(shouldUseDevServer('10.0.0')).toBe(false);
  });
  it(`uses the env variable`, () => {
    process.env.EXPO_USE_DEV_SERVER = String(true);
    expect(shouldUseDevServer('10.0.0')).toBe(true);
    expect(shouldUseDevServer('41.0.0')).toBe(true);
  });
});
