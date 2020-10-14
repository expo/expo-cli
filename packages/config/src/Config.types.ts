import { ExpoConfig } from '@expo/config-types';
import { JSONObject } from '@expo/json-file';
import { XcodeProject } from 'xcode';

import { InfoPlist } from './ios';

export interface ProjectFileSystem {
  readonly projectRoot: string;
  /**
   * Project root for the specific platform.
   */
  readonly platformProjectRoot: string;
}

export interface FileModifierProps<IData> {
  /**
   * The Object representation of a complex file type.
   */
  data: IData;
  /**
   * file path for the output data.
   */
  filePath?: string;
}

export interface IOSProjectModifierProps {
  // Something like projectRoot/ios/[MyApp]/
  projectName: string;
}

export interface AndroidResourceProjectModifierProps {
  // app/src/main/res/${kind}/${name}.xml
  kind: string;
}
export interface PluginFileModifierProps<IData>
  extends ProjectFileSystem,
    FileModifierProps<IData> {}

export type PluginModifier<T extends ProjectFileSystem = ProjectFileSystem> = (
  props: T
) => T | Promise<T>;

export interface IOSPluginModifierProps<IData>
  extends IOSProjectModifierProps,
    PluginFileModifierProps<IData> {}

export type AnyAndroidFileResourceModifier = PluginFileModifierProps<JSONObject> &
  AndroidResourceProjectModifierProps;

export type IOSPluginXcodeProjModifier = PluginModifier<IOSPluginModifierProps<XcodeProject>>;
type IOSPlistModifier = PluginModifier<IOSPluginModifierProps<InfoPlist>>;

export interface PluginConfig {
  android?: {
    manifest?: PluginModifier<PluginFileModifierProps<JSONObject>>;
    strings?: PluginModifier<AnyAndroidFileResourceModifier>;
    file?: PluginModifier;
  };
  ios?: {
    entitlements?: IOSPlistModifier;
    expoPlist?: IOSPlistModifier;
    xcodeproj?: IOSPluginXcodeProjModifier;
    file?: PluginModifier<IOSProjectModifierProps & ProjectFileSystem>;
  };
}

export type PluginPlatform = keyof PluginConfig;

// TODO: Migrate ProjectConfig to using expo instead if exp
export interface ExportedConfig {
  plugins: PluginConfig | null;
  expo: ExpoConfig;
}

export type ConfigPlugin<IProps = any | undefined> = (
  config: ExportedConfig,
  props: IProps
) => ExportedConfig;

export { ExpoConfig };

export type PackageJSONConfig = Record<string, any>;

export interface ProjectConfig {
  /**
   * Fully evaluated Expo config with default values injected.
   */
  exp: ExpoConfig;
  /**
   * Dynamic config for processing native files during the generation process. This only exists if an Expo config exports and `expo` and `plugins` object.
   */
  plugins: PluginConfig | null;
  /**
   * Project package.json object with default values injected.
   */
  pkg: PackageJSONConfig;
  /**
   * Unaltered static config (app.config.json, app.json, or custom json config).
   * For legacy, an empty object will be returned even if no static config exists.
   */
  rootConfig: AppJSONConfig;
  /**
   * Path to the static json config file if it exists.
   * If a project has an app.config.js and an app.json then app.json will be returned.
   * If a project has an app.config.json and an app.json then app.config.json will be returned.
   * Returns null if no static config file exists.
   */
  staticConfigPath: string | null;
  /**
   * Path to an app.config.js or app.config.ts.
   * Returns null if no dynamic config file exists.
   */
  dynamicConfigPath: string | null;

  /**
   * Returns the type of the value exported from the dynamic config.
   * This can be used to determine if the dynamic config is potentially extending a static config when (v === 'function').
   * Returns null if no dynamic config file exists.
   */
  dynamicConfigObjectType: string | null;
}
export type AppJSONConfig = { expo: ExpoConfig; [key: string]: any };
export type BareAppConfig = { name: string; [key: string]: any };
export type HookArguments = {
  config: any;
  url: any;
  exp: ExpoConfig;
  iosBundle: string;
  iosSourceMap: string | null;
  iosManifest: any;
  androidBundle: string;
  androidSourceMap: string | null;
  androidManifest: any;
  projectRoot: string;
  log: (msg: any) => void;
};

export type ExpoAppManifest = ExpoConfig & {
  sdkVersion: string;
  bundledAssets?: string[];
  isKernel?: boolean;
  xde?: boolean;
  kernel?: { androidManifestPath?: string; iosManifestPath?: string };
  assetUrlOverride?: string;
  publishedTime?: string;
  commitTime?: string;
  releaseId?: string;
  revisionId?: string;
  mainModuleName?: string;
  env?: Record<string, any>;
  bundleUrl?: string;
  debuggerHost?: string;
  logUrl?: string;
  hostUri?: string;
  id?: string;
  developer?: {
    tool: string | null;
    projectRoot?: string;
  };
  ios?: { publishSourceMapPath?: string } & ExpoConfig['ios'];
  android?: { publishSourceMapPath?: string } & ExpoConfig['android'];
};

export type Hook = {
  file: string;
  config: any;
};

export type HookType = 'postPublish' | 'postExport';

export enum ProjectPrivacy {
  PUBLIC = 'public',
  UNLISTED = 'unlisted',
}

export type IntentFilter = {
  action: string;
  category?: string[];
  autoVerify?: boolean;
  data?: {
    scheme?: string;
    host?: string;
    port?: string;
    path?: string;
    pathPattern?: string;
    pathPrefix?: string;
    mimeType?: string;
  };
};

export type ExpRc = { [key: string]: any };
export type Platform = 'android' | 'ios' | 'web';
export type ProjectTarget = 'managed' | 'bare';

export type ConfigErrorCode =
  | 'NO_APP_JSON'
  | 'NOT_OBJECT'
  | 'NO_EXPO'
  | 'MODULE_NOT_FOUND'
  | 'INVALID_MODE'
  | 'INVALID_FORMAT'
  | 'INVALID_CONFIG';

export type ConfigContext = {
  projectRoot: string;
  /**
   * The static config path either app.json, app.config.json, or a custom user-defined config.
   */
  staticConfigPath: string | null;
  packageJsonPath: string | null;
  config: Partial<ExpoConfig>;
};

export type GetConfigOptions = {
  skipSDKVersionRequirement?: boolean;
  strict?: boolean;
};

export type WriteConfigOptions = { dryRun?: boolean };

export type ConfigFilePaths = { staticConfigPath: string | null; dynamicConfigPath: string | null };
