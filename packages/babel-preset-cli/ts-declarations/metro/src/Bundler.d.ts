import DependencyGraph from './node-haste/DependencyGraph';
import { JsTransformOptions as TransformOptions } from './JsTransformer/worker';
import { TransformResultWithSource } from './DeltaBundler/types';
import { ConfigT } from 'metro-config/src/configTypes.flow';

export type BundlerOptions = Readonly<{
  watch?: boolean;
}>;

declare class Bundler {
  constructor(config: ConfigT, options?: BundlerOptions);

  end(): Promise<void>;

  getDependencyGraph(): Promise<DependencyGraph>;

  transformFile(
    filePath: string,
    transformOptions: TransformOptions
  ): Promise<TransformResultWithSource>;
}

export default Bundler;
