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
