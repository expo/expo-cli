import { ExpoConfig } from '@expo/config-types';
import { JSONObject } from '@expo/json-file';
import { XcodeProject } from 'xcode';

import { AndroidManifest } from './android/Manifest';
import * as AndroidPaths from './android/Paths';
import { ResourceXML } from './android/Resources';
import { ExpoPlist, InfoPlist } from './ios/IosConfig.types';

type OptionalPromise<T> = Promise<T> | T;

type Plist = JSONObject;

export interface ModProps<T = any> {
  /**
   * Project root directory for the universal app.
   */
  readonly projectRoot: string;

  /**
   * Project root for the specific platform.
   */
  readonly platformProjectRoot: string;

  /**
   * Name of the mod.
   */
  readonly modName: string;

  /**
   * Name of the platform used in the mods config.
   */
  readonly platform: ModPlatform;

  /**
   * [iOS]: The path component used for querying project files.
   *
   * @example projectRoot/ios/[projectName]/
   */
  readonly projectName?: string;

  nextMod?: Mod<T>;
}

// TODO: Migrate ProjectConfig to using expo instead if exp
export interface ExportedConfig extends ExpoConfig {
  mods?: ModConfig | null;
}

export interface ExportedConfigWithProps<Data = any> extends ExpoConfig {
  /**
   * The Object representation of a complex file type.
   */
  modResults: Data;
  modRequest: ModProps<Data>;
}

export type ConfigPlugin<Props = void> = (config: ExpoConfig, props: Props) => ExpoConfig;

export type StaticPlugin<T = any> = [string | ConfigPlugin<T>, T];

export type Mod<Props = any> = (
  config: ExportedConfigWithProps<Props>
) => OptionalPromise<ExportedConfigWithProps<Props>>;

export interface ModConfig {
  android?: {
    /**
     * Modify the `android/app/src/main/AndroidManifest.xml` as JSON (parsed with [`xml2js`](https://www.npmjs.com/package/xml2js)).
     */
    manifest?: Mod<AndroidManifest>;
    /**
     * Modify the `android/app/src/main/res/values/strings.xml` as JSON (parsed with [`xml2js`](https://www.npmjs.com/package/xml2js)).
     */
    strings?: Mod<ResourceXML>;
    /**
     * Modify the `android/app/src/main/<package>/MainActivity.java` as a string.
     */
    mainActivity?: Mod<AndroidPaths.ApplicationProjectFile>;
    /**
     * Modify the `android/app/build.gradle` as a string.
     */
    appBuildGradle?: Mod<AndroidPaths.GradleProjectFile>;
    /**
     * Modify the `android/build.gradle` as a string.
     */
    projectBuildGradle?: Mod<AndroidPaths.GradleProjectFile>;
    /**
     * Modify the `android/settings.gradle` as a string.
     */
    settingsGradle?: Mod<AndroidPaths.GradleProjectFile>;
  };
  ios?: {
    /**
     * Modify the `ios/<name>/Info.plist` as JSON (parsed with [`@expo/plist`](https://www.npmjs.com/package/@expo/plist)).
     */
    infoPlist?: Mod<InfoPlist>;
    /**
     * Modify the `ios/<name>/<product-name>.entitlements` as JSON (parsed with [`@expo/plist`](https://www.npmjs.com/package/@expo/plist)).
     */
    entitlements?: Mod<Plist>;
    /**
     * Modify the `ios/<name>/Expo.plist` as JSON (Expo updates config for iOS) (parsed with [`@expo/plist`](https://www.npmjs.com/package/@expo/plist)).
     */
    expoPlist?: Mod<Plist>;
    /**
     * Modify the `ios/<name>.xcodeproj` as an `XcodeProject` (parsed with [`xcode`](https://www.npmjs.com/package/xcode))
     */
    xcodeproj?: Mod<XcodeProject>;
    /**
     * Modify the `ios/<name>/AppDelegate.m` as a string (dangerous)
     */
    appDelegate?: Mod<XcodeProject>;
  };
}

export type ModPlatform = keyof ModConfig;

export { XcodeProject, InfoPlist, ExpoPlist, AndroidManifest };
