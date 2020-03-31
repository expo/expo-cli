import IncrementalBundler from './IncrementalBundler';
import { AssetData } from './Assets';
import { RamBundleInfo } from './DeltaBundler/Serializers/getRamBundleInfo';
import { BundleOptions } from './shared/types';
import { IncomingMessage, ServerResponse } from 'http';
import { ConfigT } from 'metro-config/src/configTypes.flow';

export type SegmentLoadData = {
  [key: number]: [Array<number>, number | null | undefined];
};
export type BundleMetadata = {
  hash: string;
  otaBuildNumber: string | null | undefined;
  mobileConfigs: Array<string>;
  segmentHashes: Array<string>;
  segmentLoadData: SegmentLoadData;
};

export type ServerOptions = Readonly<{
  watch?: boolean;
}>;

declare class Server {
  constructor(config: ConfigT, options?: ServerOptions);

  end(): void;

  getBundler(): IncrementalBundler;

  getCreateModuleId(): (path: string) => number;

  build(
    options: BundleOptions
  ): Promise<{
    code: string;
    map: string;
  }>;

  getRamBundleInfo(options: BundleOptions): Promise<RamBundleInfo>;

  getAssets(options: BundleOptions): Promise<ReadonlyArray<AssetData>>;

  getOrderedDependencyPaths(options: {
    readonly dev: boolean;
    readonly entryFile: string;
    readonly minify: boolean;
    readonly platform: string;
  }): Promise<Array<string>>;

  processRequest(
    req: IncomingMessage,
    res: ServerResponse,
    next: (arg0: Error | null | undefined) => unknown
  ): void;

  getNewBuildID(): string;

  getPlatforms(): ReadonlyArray<string>;

  getWatchFolders(): ReadonlyArray<string>;

  static DEFAULT_GRAPH_OPTIONS: {
    customTransformOptions: any;
    dev: boolean;
    hot: boolean;
    minify: boolean;
  };

  static DEFAULT_BUNDLE_OPTIONS: typeof Server.DEFAULT_GRAPH_OPTIONS & {
    excludeSource: false;
    inlineSourceMap: false;
    modulesOnly: false;
    onProgress: null;
    runModule: true;
    shallow: false;
    sourceMapUrl: null;
    sourceUrl: null;
  };
}

export default Server;
