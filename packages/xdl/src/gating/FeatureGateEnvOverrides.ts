import nullthrows from 'nullthrows';

import { Env, FeatureGateKey } from '../internal';

export default class FeatureGateEnvOverrides {
  private readonly map = new Map<string, boolean>();

  constructor() {
    const { enable, disable } = Env.getFeatureGateOverrides();
    const overrideEnableGateKeys = new Set(enable);
    const overrideDisableGateKeys = new Set(disable);

    for (const overrideEnableKey of overrideEnableGateKeys) {
      if (overrideDisableGateKeys.has(overrideEnableKey)) {
        continue;
      }
      this.map.set(overrideEnableKey, true);
    }
    for (const overrideDisableGateKey of overrideDisableGateKeys) {
      this.map.set(overrideDisableGateKey, false);
    }
  }

  public isOverridden(key: FeatureGateKey): boolean {
    return this.map.has(key) ?? false;
  }

  public getOverride(key: FeatureGateKey): boolean {
    return nullthrows(this.map.get(key));
  }
}
