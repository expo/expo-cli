import { ExpoConfig } from '@expo/config-types';
import { JSONObject } from '@expo/json-file';
import { XcodeProject } from 'xcode';

import { InfoPlist } from './ios/IosConfig.types';

type OptionalPromise<T> = Promise<T> | T;

type Plist = JSONObject;

export interface ModifierPluginProps<Data = unknown> {
  readonly projectRoot: string;
  /**
   * Project root for the specific platform.
   */
  readonly platformProjectRoot: string;

  /**
   * Name of the modifier.
   */
  readonly modifier: string;

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

  /**
   * The Object representation of a complex file type.
   */
  data: Data;
}

// TODO: Migrate ProjectConfig to using expo instead if exp
export interface ExportedConfig {
  modifiers?: ModifierConfig | null;
  expo: ExpoConfig;
}

export interface ExportedConfigWithProps<Props = any | undefined> extends ExportedConfig {
  props: Props;
}

export type ConfigPlugin<Props = any | undefined> = (
  config: ExportedConfig,
  props: Props
) => ExportedConfig;

export type ModifierPlugin<
  Props extends ModifierPluginProps = ModifierPluginProps,
  // Return value is the same as the props unless specified otherwise
  Results extends ModifierPluginProps = Props
> = (config: ExportedConfigWithProps<Props>) => OptionalPromise<ExportedConfigWithProps<Results>>;

type IOSModifierPlugin<T> = ModifierPlugin<ModifierPluginProps<T>>;

export interface ModifierConfig {
  // android?: {
  // };
  ios?: {
    infoPlist?: IOSModifierPlugin<InfoPlist>;
    entitlements?: IOSModifierPlugin<Plist>;
    expoPlist?: IOSModifierPlugin<Plist>;
    xcodeproj?: IOSModifierPlugin<XcodeProject>;
  };
}

export type ModifierPlatform = keyof ModifierConfig;
