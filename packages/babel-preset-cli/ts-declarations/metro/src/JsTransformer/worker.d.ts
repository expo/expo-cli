import { AllowOptionalDependencies } from '../DeltaBundler/types';

export type CustomTransformOptions = {
  [key: string]: unknown;
};

type DynamicRequiresBehavior = 'throwAtRuntime' | 'reject';

type MinifierConfig = Readonly<{
  [key: string]: unknown;
}>;

export interface MinifierOptions {
  code: string;
  // TODO: import { BasicSourceMap } from 'metro-source-map'
  map: unknown;
  filename: string;
  reserved: ReadonlyArray<string>;
  config: MinifierConfig;
}

export type JsTransformerConfig = Readonly<{
  assetPlugins: ReadonlyArray<string>;
  assetRegistryPath: string;
  asyncRequireModulePath: string;
  babelTransformerPath: string;
  dynamicDepsInPackages: DynamicRequiresBehavior;
  enableBabelRCLookup: boolean;
  enableBabelRuntime: boolean;
  experimentalImportBundleSupport: boolean;
  minifierConfig: MinifierConfig;
  minifierPath: string;
  optimizationSizeLimit: number;
  publicPath: string;
  allowOptionalDependencies: AllowOptionalDependencies;
}>;

export type JsTransformOptions = Readonly<{
  customTransformOptions?: CustomTransformOptions;
  dev: boolean;
  disableFlowStripTypesTransform?: boolean;
  experimentalImportSupport?: boolean;
  hot: boolean;
  inlinePlatform: boolean;
  inlineRequires: boolean;
  minify: boolean;
  unstable_disableES6Transforms?: boolean;
  platform: string | null | undefined;
  type: Type;
}>;

export type Type = 'script' | 'module' | 'asset';
