import * as BundleIdenitifer from './BundleIdentifier';
import * as Version from './Version';
import * as Name from './Name';

import { InfoPlist } from './IosConfig.types';
import { ExpoConfig } from '../Config.types';

// Maybe this will be useful?
function applyConfigToInfoPlist(config: ExpoConfig, infoPlist: InfoPlist) {
  let result = infoPlist;

  // I wish we had pipeline operator! Oh well, one day.
  result = Version.setVersion(config, result);
  result = Version.setBuildNumber(config, result);
  result = BundleIdenitifer.setBundleIdentifier(config, result);

  return result;
}

// We can change this to export * as X with TypeScript 3.8+
// https://devblogs.microsoft.com/typescript/announcing-typescript-3-8-beta/#export-star-as-namespace-syntax
// .. but we should wait for this to be the default VSCode version.
export { applyConfigToInfoPlist, BundleIdenitifer, Name, Version };
