/**
 * For internal use in Expo CLI
 */
import * as AndroidConfig from './android';
import * as IOSConfig from './ios';
import * as XML from './utils/XML';
import * as History from './utils/history';
import * as WarningAggregator from './utils/warnings';

export { IOSConfig, AndroidConfig };

export { WarningAggregator, History, XML };

export {
  withExpoIOSPlugins,
  withExpoAndroidPlugins,
  withExpoVersionedSDKPlugins,
  withExpoLegacyPlugins,
  getExpoLegacyPlugins,
} from './plugins/expo-plugins';

/**
 * These are the "config-plugins"
 */

export * from './Plugin.types';

export {
  withPlugins,
  withRunOnce,
  createRunOncePlugin,
  withDangerousMod,
  withExtendedMod,
  withBaseMod,
} from './plugins/core-plugins';

export {
  withAppDelegate,
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
  withSettingsGradle,
  withGradleProperties,
} from './plugins/android-plugins';

export { withStaticPlugin } from './plugins/static-plugins';

export { compileModsAsync } from './plugins/mod-compiler';

export { PluginError } from './utils/errors';

export * as BaseModPlugins from './plugins/compiler-plugins';
