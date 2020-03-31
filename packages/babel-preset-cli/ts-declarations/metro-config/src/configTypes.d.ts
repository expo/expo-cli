import { IncomingMessage, ServerResponse } from 'http';
import { CacheStore } from 'metro-cache';
import { CustomResolver } from 'metro-resolver';
import { BasicSourceMap, MixedSourceMap } from 'metro-source-map';
import { DeltaResult, Graph, Module, SerializerOptions } from 'metro/src/DeltaBundler/types';
import { TransformResult } from 'metro/src/DeltaBundler';
import { JsTransformerConfig } from 'metro/src/JSTransformer/worker';
import { TransformVariants } from 'metro/src/ModuleGraph/types';
import Server from 'metro/src/Server';
import { Reporter } from 'metro/src/lib/reporting';

export type PostMinifyProcess = (arg0: {
  code: string;
  map: BasicSourceMap | null | undefined;
}) => {
  code: string;
  map: BasicSourceMap | null | undefined;
};

export type PostProcessBundleSourcemap = (arg0: {
  code: Buffer | string;
  map: MixedSourceMap;
  outFileName: string;
}) => {
  code: Buffer | string;
  map: MixedSourceMap | string;
};

interface ExtraTransformOptions {
  readonly preloadedModules:
    | {
        [path: string]: true;
      }
    | false;
  readonly ramGroups: Array<string>;
  readonly transform: {
    readonly experimentalImportSupport: boolean;
    readonly inlineRequires:
      | {
          readonly blacklist: {
            [key: string]: true;
          };
        }
      | boolean;
    readonly nonInlinedRequires?: ReadonlyArray<string>;
    readonly unstable_disableES6Transforms?: boolean;
  };
}

export interface GetTransformOptionsOpts {
  dev: boolean;
  hot: boolean;
  platform: string | null | undefined;
}

export type GetTransformOptions = (
  entryPoints: ReadonlyArray<string>,
  options: GetTransformOptionsOpts,
  getDependenciesOf: (arg0: string) => Promise<Array<string>>
) => Promise<ExtraTransformOptions>;

export type Middleware = (
  arg0: IncomingMessage,
  arg1: ServerResponse,
  arg2: (e: Error | null | undefined) => unknown
) => unknown;

interface ResolverConfigT {
  assetExts: ReadonlyArray<string>;
  assetResolutions: ReadonlyArray<string>;
  blacklistRE: RegExp;
  dependencyExtractor: string | null | undefined;
  extraNodeModules: {
    [name: string]: string;
  };
  hasteImplModulePath: string | null | undefined;
  platforms: ReadonlyArray<string>;
  resolverMainFields: ReadonlyArray<string>;
  resolveRequest: CustomResolver | null | undefined;
  sourceExts: ReadonlyArray<string>;
  useWatchman: boolean;
}

interface SerializerConfigT {
  createModuleIdFactory: () => (path: string) => number;
  customSerializer: (
    entryPoint: string,
    preModules: ReadonlyArray<Module>,
    graph: Graph,
    options: SerializerOptions
  ) => string | { code: string; map: string } | null | undefined;
  experimentalSerializerHook: (graph: Graph, delta: DeltaResult) => unknown;
  getModulesRunBeforeMainModule: (entryFilePath: string) => Array<string>;
  getPolyfills: (arg0: { platform: string | null | undefined }) => ReadonlyArray<string>;
  getRunModuleStatement: (arg0: number | string) => string;
  polyfillModuleNames: ReadonlyArray<string>;
  postProcessBundleSourcemap: PostProcessBundleSourcemap;
  processModuleFilter: (modules: Module) => boolean;
}

type TransformerConfigT = JsTransformerConfig & {
  getTransformOptions: GetTransformOptions;
  postMinifyProcess: PostMinifyProcess;
  transformVariants: TransformVariants;
  workerPath: string;
  publicPath: string;
  experimentalImportBundleSupport: false;
};

interface MetalConfigT {
  cacheStores: ReadonlyArray<CacheStore<TransformResult>>;
  cacheVersion: string;
  hasteMapCacheDirectory?: string;
  maxWorkers: number;
  projectRoot: string;
  stickyWorkers: boolean;
  transformerPath: string;
  reporter: Reporter;
  resetCache: boolean;
  watchFolders: ReadonlyArray<string>;
}

interface ServerConfigT {
  enhanceMiddleware: (arg0: Middleware, arg1: Server) => Middleware;
  useGlobalHotkey: boolean;
  port: number;
  runInspectorProxy: boolean;
  verifyConnections: boolean;
}

interface SymbolicatorConfigT {
  customizeFrame: (arg0: {
    readonly file: string | null | undefined;
    readonly lineNumber: number | null | undefined;
    readonly column: number | null | undefined;
    readonly methodName: string | null | undefined;
  }) =>
    | ({ readonly collapse?: boolean } | null | undefined)
    | Promise<{ readonly collapse?: boolean } | null | undefined>;
}

export type InputConfigT = Partial<
  MetalConfigT &
    Readonly<{
      resolver: Partial<ResolverConfigT>;
      server: Partial<ServerConfigT>;
      serializer: Partial<SerializerConfigT>;
      symbolicator: Partial<SymbolicatorConfigT>;
      transformer: Partial<TransformerConfigT>;
    }>
>;

export type IntermediateConfigT = MetalConfigT & {
  resolver: ResolverConfigT;
  server: ServerConfigT;
  serializer: SerializerConfigT;
  symbolicator: SymbolicatorConfigT;
  transformer: TransformerConfigT;
};

export type ConfigT = Readonly<
  Readonly<MetalConfigT> &
    Readonly<{
      resolver: Readonly<ResolverConfigT>;
      server: Readonly<ServerConfigT>;
      serializer: Readonly<SerializerConfigT>;
      symbolicator: Readonly<SymbolicatorConfigT>;
      transformer: Readonly<TransformerConfigT>;
    }>
>;
