import { ExpoConfig } from '../Config.types';
import { addWarningAndroid } from '../WarningAggregator';

export function getAdaptiveIcon(config: ExpoConfig) {
  // TODO: add support for applying adaptive icon config
  return config.android?.adaptiveIcon?.foregroundImage ?? null;
}

export async function setAdaptiveIconAsync(config: ExpoConfig, projectRoot: string) {
  let icon = getAdaptiveIcon(config);
  if (!icon) {
    return;
  }

  addWarningAndroid(
    'android.adaptiveIcon',
    'This is the image that your app uses on your home screen, you will need to configure it manually.'
  );
}
