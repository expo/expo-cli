import { ExpoConfig } from '@expo/config-types';
import { JSONObject } from '@expo/json-file';
import { XcodeProject } from 'xcode';

import { InfoPlist } from './ios/IosConfig.types';

type OptionalPromise<T> = Promise<T> | T;

type Plist = JSONObject;

export interface ModifierProps<T = any> {
  /**
   * Project root directory for the universal app.
   */
  readonly projectRoot: string;
  /**
   * Project root for the specific platform.
   */
  readonly platformProjectRoot: string;

  /**
   * Name of the modifier.
   */
  readonly modifierName: string;

  /**
   * Name of the platform used in the modifiers config.
   */
  readonly platform: ModifierPlatform;

  /**
   * [iOS]: The path component used for querying project files.
   *
   * @example projectRoot/ios/[projectName]/
   */
  readonly projectName?: string;

  nextModifier?: Modifier<T>;
}

// TODO: Migrate ProjectConfig to using expo instead if exp
export interface ExportedConfig extends ExpoConfig {
  modifiers?: ModifierConfig | null;
}

export interface ExportedConfigWithProps<Data = any> extends ExpoConfig {
  /**
   * The Object representation of a complex file type.
   */
  modResults: Data;
  modRequest: ModifierProps<Data>;
}

export type ConfigPlugin<Props = any> = (config: ExpoConfig, props: Props) => ExpoConfig;

export type Modifier<Props = any> = (
  config: ExportedConfigWithProps<Props>
) => OptionalPromise<ExportedConfigWithProps<Props>>;

export interface ModifierConfig {
  // android?: {
  // };
  ios?: {
    infoPlist?: Modifier<InfoPlist>;
    entitlements?: Modifier<Plist>;
    expoPlist?: Modifier<Plist>;
    xcodeproj?: Modifier<XcodeProject>;
  };
}

export type ModifierPlatform = keyof ModifierConfig;
