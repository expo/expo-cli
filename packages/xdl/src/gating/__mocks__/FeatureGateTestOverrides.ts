import { FeatureGateKey } from '../../internal';

const map = new Map();

export const setOverride = (key: FeatureGateKey, enabled: boolean): void => {
  map.set(key, enabled);
};

export const removeOverride = (key: FeatureGateKey): void => {
  map.delete(key);
};

export const isOverridden = (key: FeatureGateKey): boolean => map.has(key);

export const getOverride = (key: FeatureGateKey): boolean => {
  if (map.has(key)) {
    return map.get(key);
  }
  throw new Error(`Key ${key} not overridden`);
};
