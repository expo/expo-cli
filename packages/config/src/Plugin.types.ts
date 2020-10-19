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
export interface ExportedConfig extends ExpoConfig {
  modifiers?: ModifierConfig | null;
}

export interface ExportedConfigWithProps<Props = any> extends ExpoConfig {
  modProps: Props;
}

export type ConfigPlugin<Props = any> = (config: ExpoConfig, props: Props) => ExpoConfig;

export type Modifier<
  Props extends ModifierProps = ModifierProps,
  // Return value is the same as the props unless specified otherwise
  Results extends ModifierProps = Props
> = (config: ExportedConfigWithProps<Props>) => OptionalPromise<ExportedConfigWithProps<Results>>;

export interface ModifierConfig {
  // android?: {
  // };
  ios?: {
    infoPlist?: Modifier<ModifierProps<InfoPlist>>;
    entitlements?: Modifier<ModifierProps<Plist>>;
    expoPlist?: Modifier<ModifierProps<Plist>>;
    xcodeproj?: Modifier<ModifierProps<XcodeProject>>;
  };
}

export type ModifierPlatform = keyof ModifierConfig;
