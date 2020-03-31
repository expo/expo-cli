import { ExpoConfig } from '../Config.types';
import { addWarningAndroid } from '../WarningAggregator';

export function getIcon(config: ExpoConfig) {
  // Until we add support applying icon config we just test if the user has configured the icon
  // so we can warn
  if (config.icon || config.android?.icon) {
    return true;
  } else {
    return false;
  }
}

export async function setIconAsync(config: ExpoConfig, projectRoot: string) {
  let icon = getIcon(config);
  if (!icon) {
    return;
  }

  addWarningAndroid(
    'icon',
    'This is the image that your app uses on your home screen, you will need to configure it manually.'
  );
}
