import { ExpoConfig } from '@expo/config-types';
import { JSONObject } from '@expo/json-file';
import { XcodeProject } from 'xcode';

import { InfoPlist } from './ios/IosConfig.types';

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

export type ConfigPlugin<Props = any> = (config: ExpoConfig, props: Props) => ExpoConfig;

export type Mod<Props = any> = (
  config: ExportedConfigWithProps<Props>
) => OptionalPromise<ExportedConfigWithProps<Props>>;

export interface ModConfig {
  // android?: {
  // };
  ios?: {
    infoPlist?: Mod<InfoPlist>;
    entitlements?: Mod<Plist>;
    expoPlist?: Mod<Plist>;
    xcodeproj?: Mod<XcodeProject>;
  };
}

export type ModPlatform = keyof ModConfig;
