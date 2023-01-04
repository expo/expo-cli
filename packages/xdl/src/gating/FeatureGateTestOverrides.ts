import { FeatureGateKey } from '../internal';

export const setOverride = (_key: FeatureGateKey, _enabled: boolean): void => {
  throw new Error('Must use mocked FeatureGateTestOverrides');
};

export const removeOverride = (_key: FeatureGateKey): void => {
  throw new Error('Must use mocked FeatureGateTestOverrides');
};

export const isOverridden = (_key: FeatureGateKey): boolean => false;

export const getOverride = (_key: FeatureGateKey): boolean => {
  throw new Error('Must use mocked FeatureGateTestOverrides');
};
