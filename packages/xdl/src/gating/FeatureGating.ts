import {
  featureGateDefaultValueWhenNoServerValue,
  FeatureGateEnvOverrides,
  FeatureGateKey,
  FeatureGateTestOverrides,
} from '../internal';

export default class FeatureGating {
  constructor(
    private readonly serverValues: { [key: string]: boolean },
    private readonly envOverrides: FeatureGateEnvOverrides
  ) {}

  public isEnabled(experimentKey: FeatureGateKey): boolean {
    if (process.env.NODE_ENV === 'test' && FeatureGateTestOverrides.isOverridden(experimentKey)) {
      return FeatureGateTestOverrides.getOverride(experimentKey);
    }

    if (this.envOverrides.isOverridden(experimentKey)) {
      return this.envOverrides.getOverride(experimentKey);
    }

    if (experimentKey in this.serverValues) {
      return this.serverValues[experimentKey];
    }

    return featureGateDefaultValueWhenNoServerValue[experimentKey];
  }

  /**
   * Test gate override methods
   */

  public static overrideKeyForScope(
    key: FeatureGateKey,
    enabled: boolean,
    scope: () => void
  ): void {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error(`Cannot overrideKeyForScope outside of test environment`);
    }

    FeatureGateTestOverrides.setOverride(key, enabled);
    try {
      scope();
    } finally {
      FeatureGateTestOverrides.removeOverride(key);
    }
  }

  public static async overrideKeyForScopeAsync(
    key: FeatureGateKey,
    enabled: boolean,
    scope: () => Promise<void>
  ): Promise<void> {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error(`Cannot overrideKeyForScopeAsync outside of test environment`);
    }

    FeatureGateTestOverrides.setOverride(key, enabled);
    try {
      await scope();
    } finally {
      FeatureGateTestOverrides.removeOverride(key);
    }
  }

  public static overrideKeyForEachInTest(key: FeatureGateKey, enabled: boolean): void {
    beforeEach(() => FeatureGateTestOverrides.setOverride(key, enabled));
    afterEach(() => FeatureGateTestOverrides.removeOverride(key));
  }
}
