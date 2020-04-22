import { ExpoConfig } from '../Config.types';
import { addWarningIOS } from '../WarningAggregator';

export function getIcons(config: ExpoConfig) {
  // Until we add support applying icon config we just test if the user has configured the icon
  // so we can warn
  if (config.icon || config.ios?.icon) {
    return true;
  } else {
    return false;
  }
}

export function setIconsAsync(config: ExpoConfig, projectRoot: string) {
  let icon = getIcons(config);
  if (!icon) {
    return;
  }

  addWarningIOS(
    'icon',
    'This is the image that your app uses on your home screen, you will need to configure it manually.'
  );
}
