/**
 * For internal use in Expo CLI
 */
import * as AndroidConfig from './android';
import * as IOSConfig from './ios';
import {
  getAndroidIntrospectModFileProviders,
  getAndroidModFileProviders,
  withAndroidBaseMods,
} from './plugins/withAndroidBaseMods';
import {
  getIosIntrospectModFileProviders,
  getIosModFileProviders,
  withIosBaseMods,
} from './plugins/withIosBaseMods';
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

export { withPlugins } from './plugins/withPlugins';

export { withRunOnce, createRunOncePlugin } from './plugins/withRunOnce';

export { withDangerousMod } from './plugins/withDangerousMod';
export { withMod, withBaseMod } from './plugins/withMod';

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

export { withStaticPlugin } from './plugins/withStaticPlugin';

export { compileModsAsync, withDefaultBaseMods, evalModsAsync } from './plugins/mod-compiler';

export { PluginError } from './utils/errors';

export const BaseMods = {
  withAndroidBaseMods,
  getAndroidModFileProviders,
  getAndroidIntrospectModFileProviders,
  withIosBaseMods,
  getIosModFileProviders,
  getIosIntrospectModFileProviders,
};
