export enum FeatureGateKey {
  // for tests
  TEST = 'test',
}

export const featureGateDefaultValueWhenNoServerValue: Record<FeatureGateKey, boolean> = {
  [FeatureGateKey.TEST]: true,
};
