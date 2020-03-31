import { ConfigT } from 'metro-config';
import Bundler from './Bundler';
import DeltaBundler from './DeltaBundler';
import { Options as DeltaBundlerOptions } from './DeltaBundler/types';
import { DeltaResult, Module, Graph } from './DeltaBundler';
import { JsTransformOptions as TransformOptions } from './JsTransformer/worker';
import { TransformInputOptions } from './lib/transformHelpers';

export type RevisionId = string;

export type OutputGraph = Graph;

export interface GraphRevision {
  id: RevisionId;
  date: Date;
  graphId: GraphId;
  graph: OutputGraph;
  prepend: ReadonlyArray<Module>;
}

export type IncrementalBundlerOptions = Readonly<{
  watch?: boolean;
}>;

type GraphId = string;

type OtherOptions = {
  readonly onProgress: DeltaBundlerOptions['onProgress'];
  readonly shallow: boolean;
};

declare class IncrementalBundler {
  static revisionIdFromString: (str: string) => RevisionId;

  constructor(config: ConfigT, options?: IncrementalBundlerOptions);

  end(): void;

  getBundler(): Bundler;

  getDeltaBundler(): DeltaBundler;

  getRevision(revisionId: RevisionId): Promise<GraphRevision> | null | undefined;

  getRevisionByGraphId(graphId: GraphId): Promise<GraphRevision> | null | undefined;

  buildGraphForEntries(
    entryFiles: ReadonlyArray<string>,
    transformOptions: TransformInputOptions,
    otherOptions?: OtherOptions
  ): Promise<OutputGraph>;

  buildGraph(
    entryFile: string,
    transformOptions: TransformInputOptions,
    otherOptions?: OtherOptions
  ): Promise<{
    readonly graph: OutputGraph;
    readonly prepend: ReadonlyArray<Module>;
  }>;

  initializeGraph(
    entryFile: string,
    transformOptions: TransformInputOptions,
    otherOptions?: OtherOptions
  ): Promise<{
    delta: DeltaResult;
    revision: GraphRevision;
  }>;

  updateGraph(
    revision: GraphRevision,
    reset: boolean
  ): Promise<{
    delta: DeltaResult;
    revision: GraphRevision;
  }>;
}

export default IncrementalBundler;
