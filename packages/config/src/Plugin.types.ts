import { ExpoConfig } from '@expo/config-types';
import { JSONObject } from '@expo/json-file';
import { XcodeProject } from 'xcode';

import { InfoPlist } from './ios/IosConfig.types';

type OptionalPromise<T> = Promise<T> | T;

type Plist = JSONObject;

export interface ModifierProps<Data = unknown> {
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

export interface ExportedConfigWithProps<Props = any> extends ExportedConfig {
  props: Props;
}

export type ConfigPlugin<Props = any> = (config: ExportedConfig, props: Props) => ExportedConfig;

export type Modifier<
  Props extends ModifierProps = ModifierProps,
  // Return value is the same as the props unless specified otherwise
  Results extends ModifierProps = Props
> = (config: ExportedConfigWithProps<Props>) => OptionalPromise<ExportedConfigWithProps<Results>>;

type IOSModifier<T> = Modifier<ModifierProps<T>>;

export interface ModifierConfig {
  // android?: {
  // };
  ios?: {
    infoPlist?: IOSModifier<InfoPlist>;
    entitlements?: IOSModifier<Plist>;
    expoPlist?: IOSModifier<Plist>;
    xcodeproj?: IOSModifier<XcodeProject>;
  };
}

export type ModifierPlatform = keyof ModifierConfig;
