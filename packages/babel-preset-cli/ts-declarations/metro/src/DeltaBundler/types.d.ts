export interface MixedOutput {
  readonly data: unknown;
  readonly type: string;
}

interface BabelSourceLocation {
  start: { line: number; column: number };
  end: { line: number; column: number };
  identifierName?: string;
}

export interface TransformResultDependency {
  /**
   * The literal name provided to a require or import call. For example 'foo' in
   * case of `require('foo')`.
   */
  readonly name: string;

  /**
   * Extra data returned by the dependency extractor. Whatever is added here is
   * blindly piped by Metro to the serializers.
   */
  readonly data: {
    /**
     * If `true` this dependency is due to a dynamic `import()` call. If `false`,
     * this dependency was pulled using a synchronous `require()` call.
     */
    readonly isAsync: boolean;

    /**
     * The dependency is actually a `__prefetchImport()` call.
     */
    readonly isPrefetchOnly?: true;

    /**
     * The condition for splitting on this dependency edge.
     */
    readonly splitCondition?: {
      readonly mobileConfigName: string;
    };

    /**
     * The dependency is enclosed in a try/catch block.
     */
    readonly isOptional?: boolean;

    readonly locs: ReadonlyArray<BabelSourceLocation>;
  };
}

export interface Dependency {
  readonly absolutePath: string;
  readonly data: TransformResultDependency;
}

export interface Module<T = MixedOutput> {
  readonly dependencies: Map<string, Dependency>;
  readonly inverseDependencies: Set<string>;
  readonly output: ReadonlyArray<T>;
  readonly path: string;
  readonly getSource: () => Buffer;
}

export interface Graph<T = MixedOutput> {
  dependencies: Map<string, Module<T>>;
  importBundleNames: Set<string>;
  readonly entryPoints: ReadonlyArray<string>;
}

export type TransformResult<T = MixedOutput> = Readonly<{
  dependencies: ReadonlyArray<TransformResultDependency>;
  output: ReadonlyArray<T>;
}>;

export type TransformResultWithSource<T = MixedOutput> = Readonly<
  TransformResult<T> & {
    getSource: () => Buffer;
  }
>;

export type TransformFn<T = MixedOutput> = (arg0: string) => Promise<TransformResultWithSource<T>>;
export interface AllowOptionalDependenciesWithOptions {
  readonly exclude: Array<string>;
}
export type AllowOptionalDependencies = boolean | AllowOptionalDependenciesWithOptions;

export interface Options<T = MixedOutput> {
  readonly resolve: (from: string, to: string) => string;
  readonly transform: TransformFn<T>;
  readonly onProgress: (numProcessed: number, total: number) => unknown | null | undefined;
  readonly experimentalImportBundleSupport: boolean;
  readonly shallow: boolean;
}

export interface DeltaResult<T = MixedOutput> {
  readonly added: Map<string, Module<T>>;
  readonly modified: Map<string, Module<T>>;
  readonly deleted: Set<string>;
  readonly reset: boolean;
}

export interface SerializerOptions {
  readonly asyncRequireModulePath: string;
  readonly createModuleId: (arg0: string) => number;
  readonly dev: boolean;
  readonly getRunModuleStatement: (arg0: number | string) => string;
  readonly inlineSourceMap: boolean | null | undefined;
  readonly modulesOnly: boolean;
  readonly processModuleFilter: (module: Module) => boolean;
  readonly projectRoot: string;
  readonly runBeforeMainModule: ReadonlyArray<string>;
  readonly runModule: boolean;
  readonly sourceMapUrl: string | null | undefined;
  readonly sourceUrl: string | null | undefined;
}
