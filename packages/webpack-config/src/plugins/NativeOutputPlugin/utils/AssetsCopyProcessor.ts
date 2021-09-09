import fs from 'fs-extra';
import path from 'path';
import { Chunk, Compilation } from 'webpack';

type WebpackLogger = any;

export class AssetsCopyProcessor {
  queue: (() => Promise<void>)[] = [];

  constructor(
    public readonly config: {
      platform: string;
      compilation: Compilation;
      outputPath: string;
      bundleOutput: string;
      bundleOutputDir: string;
      sourcemapOutput: string;
      assetsDest: string;
      logger: WebpackLogger;
    },
    private filesystem: Pick<typeof fs, 'ensureDir' | 'copyFile'> = fs
  ) {}

  private async copyAsset(from: string, to: string) {
    this.config.logger.debug('Copying asset:', from, 'to:', to);
    try {
      await this.filesystem.ensureDir(path.dirname(to));
      await this.filesystem.copyFile(from, to);
    } catch (error) {
      console.log('failed to copy');
      throw error;
    }
  }

  enqueueChunk(chunk: Chunk, { isEntry }: { isEntry: boolean }) {
    const {
      compilation,
      outputPath,
      bundleOutput,
      sourcemapOutput,
      bundleOutputDir,
      assetsDest,
      platform,
    } = this.config;
    const sourcemapOutputDir = path.dirname(sourcemapOutput);

    const [chunkFile] = [...chunk.files];
    const relatedSourceMap = compilation.assetsInfo.get(chunkFile)?.related?.sourceMap;
    const sourceMapFile = Array.isArray(relatedSourceMap) ? relatedSourceMap[0] : relatedSourceMap;

    this.queue.push(() =>
      this.copyAsset(
        path.join(outputPath, chunkFile),
        isEntry
          ? bundleOutput
          : path.join(platform === 'ios' ? assetsDest : bundleOutputDir, chunkFile)
      )
    );

    if (sourceMapFile) {
      this.queue.push(() =>
        this.copyAsset(
          path.join(outputPath, sourceMapFile),
          isEntry
            ? sourcemapOutput
            : path.join(platform === 'ios' ? assetsDest : sourcemapOutputDir, sourceMapFile)
        )
      );
    }

    const mediaAssets = [...chunk.auxiliaryFiles].filter(
      file => !/\.(map|bundle\.json)$/.test(file)
    );
    this.queue.push(
      ...mediaAssets.map(asset => () =>
        this.copyAsset(path.join(outputPath, asset), path.join(assetsDest, asset))
      )
    );

    const manifests = [...chunk.auxiliaryFiles].filter(file => /\.bundle\.json$/.test(file));
    this.queue.push(
      ...manifests.map(asset => () =>
        this.copyAsset(
          path.join(outputPath, asset),
          path.join(platform === 'ios' ? assetsDest : bundleOutputDir, asset)
        )
      )
    );
  }

  execute() {
    const queue = this.queue;
    this.queue = [];
    return queue.map(work => work());
  }
}
