import { ExpoConfig } from '@expo/config-types';
import { JSONObject } from '@expo/json-file';
import { XcodeProject } from 'xcode';

import { InfoPlist } from './ios/IosConfig.types';

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

type OptionalPromise<T> = Promise<T> | T;

// TODO: Migrate ProjectConfig to using expo instead if exp
export interface ExportedConfig {
  modifiers?: ModifierConfig | null;
  expo: ExpoConfig;
}

export interface ExportedConfigWithProps<Props = any | undefined> extends ExportedConfig {
  props: Props;
}

export type ConfigPlugin<IProps = any | undefined> = (
  config: ExportedConfig,
  props: IProps
) => ExportedConfig;

export type ModifierPlugin<
  IProps extends ModifierPluginProps = ModifierPluginProps,
  // Return value is the same as the props unless specified otherwise
  IResults extends ModifierPluginProps = IProps
> = (config: ExportedConfigWithProps<IProps>) => OptionalPromise<ExportedConfigWithProps<IResults>>;

type IOSModifierPlugin<T> = ModifierPlugin<ModifierPluginProps<T>>;

export interface ModifierConfig {
  // android?: {
  // };
  ios?: {
    infoPlist?: IOSModifierPlugin<InfoPlist>;
    entitlements?: IOSModifierPlugin<JSONObject>;
    expoPlist?: IOSModifierPlugin<JSONObject>;
    xcodeproj?: IOSModifierPlugin<XcodeProject>;
  };
}

export type ModifierPlatform = keyof ModifierConfig;
