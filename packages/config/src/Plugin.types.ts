import { ExpoConfig } from '@expo/config-types';
import { JSONObject } from '@expo/json-file';
import { XcodeProject } from 'xcode';

import { InfoPlist } from './ios/IosConfig.types';

export interface PluginModifierProps<Data = unknown> {
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
   * Name of the platform used in the plugins config.
   */
  readonly platform: PluginPlatform;

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
  plugins?: PluginConfig | null;
  expo: ExpoConfig;
}

export interface ExportedConfigWithProps<Props = any | undefined> extends ExportedConfig {
  props: Props;
}

export type ConfigPlugin<IProps = any | undefined> = (
  config: ExportedConfig,
  props: IProps
) => ExportedConfig;

export type ConfigModifierPlugin<
  IProps extends PluginModifierProps = PluginModifierProps,
  // Return value is the same as the props unless specified otherwise
  IResults extends PluginModifierProps = IProps
> = (config: ExportedConfigWithProps<IProps>) => OptionalPromise<ExportedConfigWithProps<IResults>>;

type IOSConfigModifierPlugin<T> = ConfigModifierPlugin<PluginModifierProps<T>>;

export interface PluginConfig {
  // android?: {
  // };
  ios?: {
    infoPlist?: IOSConfigModifierPlugin<InfoPlist>;
    entitlements?: IOSConfigModifierPlugin<JSONObject>;
    expoPlist?: IOSConfigModifierPlugin<JSONObject>;
    xcodeproj?: IOSConfigModifierPlugin<XcodeProject>;
  };
}

export type PluginPlatform = keyof PluginConfig;
