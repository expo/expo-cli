import path from 'path';
import webpack from 'webpack';

import { AssetsCopyProcessor } from './utils/AssetsCopyProcessor';

/**
 * {@link OutputPlugin} configuration options.
 */
export interface OutputPluginConfig {
  /** Target application platform. */
  platform: string;

  /**
   * Mark all chunks as a local chunk, meaning they will be bundled into the `.ipa`/`.apk` file.
   * All chunks not matched by the rule(s) will become a remote one.
   */
  localChunks?: webpack.RuleSetRule | webpack.RuleSetRule[];

  /**
   * Output directory for all remote chunks and assets that are not bundled into
   * the `.ipa`/`.apk` file.
   * When left unspecified (`undefined`), the files will be available under `output.path`, next to
   * the main/index bundle and other local chunks.
   */
  remoteChunksOutput?: string;

  //   outputDirectory: string;
  bundleOutput: string;
  assetsDest?: string;
  sourcemapOutput?: string;
  projectRoot: string;
}

function getDefaultBundleName(platform: string) {
  return platform === 'ios' ? 'index.jsbundle' : 'index.android.bundle';
}
// function getDefaultBundleOutput(outputDirectory: string, platform: string) {
//     return path.join(outputDirectory, getDefaultBundleName(platform));
// }

// type BundleOptions = {
//     assetOutput?: string;
//     platform: string;
//     bundleOutput?: string;
//     entryPoint: string;
//     bundleEncoding?: 'utf8' | 'utf16le' | 'ascii';
//     indexedRamBundle?: boolean;
//     sourcemapOutput?: string;
//     sourcemapSourcesRoot?: string;
//     sourcemapUseAbsolutePath?: boolean;
// }

// import assert from 'assert';

// function createPlatformBundleOptions(
//     projectRoot: string,
//     outputDir: string,
//     options: Pick<
//       Options,
//       'platform' | 'dev' | 'sourcemapOutput' | 'bundleOutput' | 'assetsOutput' | 'entryFile'
//     >
//   ): BundleOptions {
//     // Create a default bundle name
//     const defaultBundleName = options.platform === 'ios' ? 'index.jsbundle' : 'index.android.bundle';

//     if (!options.entryFile) {
//       const entryFile = resolveEntryPoint(projectRoot, { platform: options.platform });
//       assert(
//         entryFile,
//         `The project entry file could not be resolved. Please either define it in the \`package.json\` (main), \`app.json\` (expo.entryPoint), create an \`index.js\`, or install the \`expo\` package.`
//       );
//       options.entryFile = entryFile;
//     }

//     return {
//       bundleOutput: options.bundleOutput || path.join(outputDir, defaultBundleName),
//       assetOutput: options.assetsOutput || outputDir,
//       platform: options.platform,
//       // Use Expo's entry point resolution to ensure all commands act the same way.
//       entryPoint: options.entryFile,
//       sourcemapOutput: options.sourcemapOutput || path.join(outputDir, defaultBundleName + '.map'),
//       // This prevents the absolute path from being shown in the source code, shouts out to Satya.
//       sourcemapSourcesRoot: projectRoot,
//       // For now, just use dev for both dev and minify
//       dev: !!options.dev,
//       minify: !options.dev,
//     };
//   }

/**
 * Plugin for copying generated files (bundle, chunks, assets) from Webpack's built location to the
 * React Native application directory, so that the files can be packed together into the `ipa`/`apk`.
 *
 * @category Webpack Plugin
 */
export class NativeOutputPlugin {
  /**
   * Constructs new `OutputPlugin`.
   *
   * @param config Plugin configuration options.
   */
  constructor(private config: OutputPluginConfig) {
    if (!this.config.platform) {
      throw new Error('Missing `platform` option in `OutputPlugin`');
    }
  }

  /**
   * Apply the plugin.
   *
   * @param compiler Webpack compiler instance.
   */
  apply(compiler: webpack.Compiler) {
    const logger = compiler.getInfrastructureLogger(this.constructor.name);

    const args = this.config;
    let { bundleOutput, projectRoot, assetsDest = '', sourcemapOutput = '' } = args;
    if (!path.isAbsolute(bundleOutput)) {
      bundleOutput = path.join(projectRoot, bundleOutput);
    }
    const bundleOutputDir = path.dirname(bundleOutput);

    if (!sourcemapOutput) {
      sourcemapOutput = `${bundleOutput}.map`;
    }
    if (!path.isAbsolute(sourcemapOutput)) {
      sourcemapOutput = path.join(projectRoot, sourcemapOutput);
    }

    if (!assetsDest) {
      assetsDest = bundleOutputDir;
    }

    let remoteChunksOutput = this.config.remoteChunksOutput;
    if (remoteChunksOutput && !path.isAbsolute(remoteChunksOutput)) {
      remoteChunksOutput = path.join(projectRoot, remoteChunksOutput);
    }

    logger.debug('Detected output paths:', {
      bundleOutput,
      sourcemapOutput,
      assetsDest,
      remoteChunksOutput,
    });

    const isLocalChunk = (chunkId: string): boolean =>
      webpack.ModuleFilenameHelpers.matchObject(
        {
          include: this.config.localChunks,
        },
        chunkId
      );

    let entryGroup: webpack.Compilation['chunkGroups'][0] | undefined;
    const localChunks: webpack.Chunk[] = [];
    const remoteChunks: webpack.Chunk[] = [];

    compiler.hooks.compilation.tap(this.constructor.name, compilation => {
      compilation.hooks.afterProcessAssets.tap(this.constructor.name, assets => {
        entryGroup = compilation.chunkGroups.find(group => group.isInitial());
        const sharedChunks = new Set<webpack.Chunk>();
        let entryChunk: webpack.Chunk | undefined;

        for (const chunk of compilation.chunks) {
          // Do not process shared chunks right now.
          if (sharedChunks.has(chunk)) {
            continue;
          }

          [...chunk.getAllInitialChunks()]
            .filter(sharedChunk => sharedChunk !== chunk)
            .forEach(sharedChunk => {
              sharedChunks.add(sharedChunk);
            });

          // Entry chunk
          if (entryGroup?.chunks[0] === chunk) {
            entryChunk = chunk;
            localChunks.push(chunk);
          } else if (isLocalChunk(chunk.name ?? chunk.id?.toString())) {
            localChunks.push(chunk);
          } else {
            remoteChunks.push(chunk);
          }
        }

        // Process shared chunks to add them either as local or remote chunk.
        for (const sharedChunk of sharedChunks) {
          const isUsedByLocalChunk = localChunks.some(localChunk => {
            return [...localChunk.getAllInitialChunks()].includes(sharedChunk);
          });
          if (isUsedByLocalChunk || isLocalChunk(sharedChunk.name ?? sharedChunk.id?.toString())) {
            localChunks.push(sharedChunk);
          } else {
            remoteChunks.push(sharedChunk);
          }
        }

        if (!entryChunk) {
          throw new Error('Cannot infer entry chunk - this should have not happened.');
        }

        const mainBundleAssetName = [...entryChunk.files][0];
        const mainBundleSource = assets[mainBundleAssetName];
        assets[mainBundleAssetName] = new webpack.sources.ConcatSource(
          `var __CHUNKS__=${JSON.stringify({
            local: localChunks.map(localChunk => localChunk.name ?? localChunk.id),
          })};\n`,
          mainBundleSource
        );
      });
    });

    compiler.hooks.afterEmit.tapPromise(this.constructor.name, async compilation => {
      const outputPath = compilation.outputOptions.path;
      if (!outputPath) {
        throw new Error('Cannot infer output path from compilation');
      }

      const localAssetsCopyProcessor = new AssetsCopyProcessor({
        platform: this.config.platform,
        compilation,
        outputPath,
        bundleOutput: bundleOutput!,
        bundleOutputDir,
        sourcemapOutput,
        assetsDest,
        logger,
      });
      const remoteAssetsCopyProcessor = new AssetsCopyProcessor({
        platform: this.config.platform,
        compilation,
        outputPath,
        bundleOutput: '',
        bundleOutputDir: remoteChunksOutput ?? '',
        sourcemapOutput: '',
        assetsDest: remoteChunksOutput ?? '',
        logger,
      });

      for (const chunk of localChunks) {
        // Process entry chunk
        localAssetsCopyProcessor.enqueueChunk(chunk, {
          isEntry: entryGroup?.chunks[0] === chunk,
        });
      }

      if (remoteChunksOutput) {
        for (const chunk of remoteChunks) {
          remoteAssetsCopyProcessor.enqueueChunk(chunk, { isEntry: false });
        }
      }

      await Promise.all([
        ...localAssetsCopyProcessor.execute(),
        ...remoteAssetsCopyProcessor.execute(),
      ]);
    });
  }
}
