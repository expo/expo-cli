export type PackageJSONConfig = { [key: string]: any };
export type ProjectConfig = { exp: ExpoConfig; pkg: PackageJSONConfig; rootConfig: AppJSONConfig };
export type AppJSONConfig = { expo: ExpoConfig; [key: string]: any };
export type BareAppConfig = { name: string; displayName: string; [key: string]: any };
export type ExpoConfig = {
  name?: string;
  slug?: string;
  description?: string;
  sdkVersion?: string;
  platforms?: Array<Platform>;
  nodeModulesPath?: string;
  [key: string]: any;
};
export type ExpRc = { [key: string]: any };
export type Platform = 'android' | 'ios' | 'web';
export type ConfigErrorCode =
  | 'NO_APP_JSON'
  | 'NOT_OBJECT'
  | 'NO_EXPO'
  | 'MODULE_NOT_FOUND'
  | 'INVALID_CONFIG';
export type ConfigContext = {
  projectRoot: string;
  configRoot: string;
  config: Partial<ExpoConfig>;
};
