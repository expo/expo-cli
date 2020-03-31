import Bundler from './Bundler';
import { DeltaResult, Graph, MixedOutput, Options } from './DeltaBundler/types';

export {
  DeltaResult,
  Graph,
  MixedOutput,
  Module,
  TransformFn,
  TransformResult,
  TransformResultDependency,
  TransformResultWithSource,
} from './DeltaBundler/types';

declare class DeltaBundler<T = MixedOutput> {
  constructor(bundler: Bundler);

  end(): void;

  buildGraph(entryPoints: ReadonlyArray<string>, options: Options<T>): Promise<Graph<T>>;

  getDelta(
    graph: Graph<T>,
    {
      reset,
      shallow,
    }: {
      reset: boolean;
      shallow: boolean;
    }
  ): Promise<DeltaResult<T>>;

  listen(graph: Graph<T>, callback: () => unknown): () => void;

  endGraph(graph: Graph<T>): void;
}

export default DeltaBundler;
