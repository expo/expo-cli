import { ExpoConfig } from '../Config.types';
import { addWarningIOS } from '../WarningAggregator';

export function getLocales(config: ExpoConfig) {
  if (config.locales) {
    return true;
  } else {
    return false;
  }
}

export function setLocalesAsync(config: ExpoConfig, projectRoot: string) {
  let locales = getLocales(config);
  if (!locales) {
    return;
  }

  addWarningIOS(
    'locales',
    'You will need to customize the locales manually in InfoPlist.strings.',
    'https://developer.apple.com/library/archive/documentation/General/Reference/InfoPlistKeyReference/Articles/AboutInformationPropertyListFiles.html'
  );
}
