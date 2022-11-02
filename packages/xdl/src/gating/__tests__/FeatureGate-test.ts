import { Env, FeatureGateEnvOverrides, FeatureGateKey, FeatureGating } from '../../internal';

jest.mock('../FeatureGateTestOverrides');
jest.mock('../../Env', () => ({
  getFeatureGateOverrides: jest.fn(() => ({ enable: [], disable: [] })),
}));

beforeEach(() => {
  jest.resetAllMocks();

  (Env.getFeatureGateOverrides as jest.MockedFunction<
    typeof Env.getFeatureGateOverrides
  >).mockReturnValue({
    enable: [],
    disable: [],
  });
});

describe(FeatureGating, () => {
  it('supports scoped overriding', () => {
    const featureGating = new FeatureGating({}, new FeatureGateEnvOverrides());
    FeatureGating.overrideKeyForScope(FeatureGateKey.TEST, false, () => {
      expect(featureGating.isEnabled(FeatureGateKey.TEST)).toBe(false);
    });

    expect(featureGating.isEnabled(FeatureGateKey.TEST)).toBe(true);
  });

  it('supports async scoped overriding', async () => {
    const featureGating = new FeatureGating({}, new FeatureGateEnvOverrides());
    await FeatureGating.overrideKeyForScopeAsync(FeatureGateKey.TEST, false, async () => {
      expect(featureGating.isEnabled(FeatureGateKey.TEST)).toBe(false);
    });

    expect(featureGating.isEnabled(FeatureGateKey.TEST)).toBe(true);
  });

  it('uses value from the server, falls back to defined value', () => {
    const featureGating = new FeatureGating(
      { [FeatureGateKey.TEST]: true },
      new FeatureGateEnvOverrides()
    );
    expect(featureGating.isEnabled(FeatureGateKey.TEST)).toBe(true);

    const featureGating2 = new FeatureGating(
      { [FeatureGateKey.TEST]: false },
      new FeatureGateEnvOverrides()
    );
    expect(featureGating2.isEnabled(FeatureGateKey.TEST)).toBe(false);

    const featureGating3 = new FeatureGating({}, new FeatureGateEnvOverrides());
    expect(featureGating3.isEnabled(FeatureGateKey.TEST)).toBe(true);
  });

  describe('environment variable overriding', () => {
    it('supports env overrides affirmative', () => {
      (Env.getFeatureGateOverrides as jest.MockedFunction<
        typeof Env.getFeatureGateOverrides
      >).mockReturnValue({
        enable: [FeatureGateKey.TEST],
        disable: [],
      });
      const featureGating = new FeatureGating(
        { [FeatureGateKey.TEST]: false },
        new FeatureGateEnvOverrides()
      );
      expect(featureGating.isEnabled(FeatureGateKey.TEST)).toBe(true);
    });

    it('supports env overrides negative', () => {
      (Env.getFeatureGateOverrides as jest.MockedFunction<
        typeof Env.getFeatureGateOverrides
      >).mockReturnValue({
        enable: [],
        disable: [FeatureGateKey.TEST],
      });
      const featureGating = new FeatureGating(
        { [FeatureGateKey.TEST]: true },
        new FeatureGateEnvOverrides()
      );
      expect(featureGating.isEnabled(FeatureGateKey.TEST)).toBe(false);
    });
  });
});

describe('jest scoped overriding', () => {
  FeatureGating.overrideKeyForEachInTest(FeatureGateKey.TEST, false);

  it('supports jest scoped overriding', () => {
    const featureGating = new FeatureGating(
      { [FeatureGateKey.TEST]: true },
      new FeatureGateEnvOverrides()
    );
    expect(featureGating.isEnabled(FeatureGateKey.TEST)).toBe(false);
  });
});

describe('removal of jest scoped overriding', () => {
  it('jest scoped overriding is only for describe scope above', () => {
    const featureGating = new FeatureGating(
      { [FeatureGateKey.TEST]: true },
      new FeatureGateEnvOverrides()
    );
    expect(featureGating.isEnabled(FeatureGateKey.TEST)).toBe(true);
  });
});
