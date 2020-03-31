import { Options as DeltaBundlerOptions } from '../DeltaBundler/types';
import { CustomTransformOptions, MinifierOptions } from '../JSTransformer/worker';
import { TransformInputOptions } from '../lib/transformHelpers';
import { BasicSourceMap, MixedSourceMap, MetroSourceMapSegmentTuple } from 'metro-source-map';

type BundleType = 'bundle' | 'delta' | 'meta' | 'map' | 'ram' | 'cli' | 'hmr' | 'todo' | 'graph';

type MetroSourceMapOrMappings = MixedSourceMap | Array<MetroSourceMapSegmentTuple>;

export type BundleOptions = {
  bundleType: BundleType;
  customTransformOptions: CustomTransformOptions;
  dev: boolean;
  entryFile: string;
  readonly excludeSource: boolean;
  readonly hot: boolean;
  readonly inlineSourceMap: boolean;
  minify: boolean;
  readonly modulesOnly: boolean;
  onProgress: (doneCont: number, totalCount: number) => unknown | null | undefined;
  readonly platform: string | null | undefined;
  readonly runModule: boolean;
  readonly shallow: boolean;
  sourceMapUrl: string | null | undefined;
  sourceUrl: string | null | undefined;
  createModuleIdFactory?: () => (path: string) => number;
};

export type SerializerOptions = {
  readonly sourceMapUrl: string | null | undefined;
  readonly sourceUrl: string | null | undefined;
  readonly runModule: boolean;
  readonly excludeSource: boolean;
  readonly inlineSourceMap: boolean;
  readonly modulesOnly: boolean;
};

export type GraphOptions = {
  readonly shallow: boolean;
};

// Stricter representation of BundleOptions.
export type SplitBundleOptions = {
  readonly entryFile: string;
  readonly transformOptions: TransformInputOptions;
  readonly serializerOptions: SerializerOptions;
  readonly graphOptions: GraphOptions;
  readonly onProgress: DeltaBundlerOptions['onProgress'];
};

export type ModuleGroups = {
  groups: Map<number, Set<number>>;
  modulesById: Map<number, ModuleTransportLike>;
  modulesInGroups: Set<number>;
};

export type ModuleTransportLike = {
  readonly code: string;
  readonly id: number;
  readonly map: MetroSourceMapOrMappings | null | undefined;
  readonly name?: string;
  readonly sourcePath: string;
};
export type ModuleTransportLikeStrict = {
  readonly code: string;
  readonly id: number;
  readonly map: MetroSourceMapOrMappings | null | undefined;
  readonly name?: string;
  readonly sourcePath: string;
};
export type RamModuleTransport = ModuleTransportLikeStrict & {
  readonly source: string;
  readonly type: string;
};

export type OutputOptions = {
  bundleOutput: string;
  bundleEncoding?: 'utf8' | 'utf16le' | 'ascii';
  dev?: boolean;
  indexedRamBundle?: boolean;
  platform: string;
  sourcemapOutput?: string;
  sourcemapSourcesRoot?: string;
  sourcemapUseAbsolutePath?: boolean;
};

export type RequestOptions = {
  entryFile: string;
  inlineSourceMap?: boolean;
  sourceMapUrl?: string;
  dev?: boolean;
  minify: boolean;
  platform: string;
  createModuleIdFactory?: () => (path: string) => number;
  onProgress?: (transformedFileCount: number, totalFileCount: number) => void;
};

export { MinifierOptions };

export type MinifierResult = {
  code: string;
  map?: BasicSourceMap;
};

export type MetroMinifier = (arg0: MinifierOptions) => MinifierResult;
