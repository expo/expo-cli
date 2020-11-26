/**
 * For internal use in Expo CLI
 */
import * as AndroidConfig from './android';
import * as IOSConfig from './ios';
import * as WarningAggregator from './utils/warnings';

export { IOSConfig, AndroidConfig };

export { WarningAggregator };

export { withExpoIOSPlugins, withExpoAndroidPlugins } from './plugins/expo-plugins';

/**
 * These are the "config-plugins"
 */

export * from './Plugin.types';

export {
  withPlugins,
  withDangerousMod,
  withExtendedMod,
  withInterceptedMod,
} from './plugins/core-plugins';

export {
  withInfoPlist,
  withEntitlementsPlist,
  withExpoPlist,
  withXcodeProject,
} from './plugins/ios-plugins';

export {
  withAndroidManifest,
  withStringsXml,
  withMainActivity,
  withProjectBuildGradle,
  withAppBuildGradle,
} from './plugins/android-plugins';

export { compileModsAsync } from './plugins/mod-compiler';
