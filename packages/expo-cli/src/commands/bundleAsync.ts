import { getConfig } from '@expo/config';
import { bundleAsync } from '@expo/dev-server';
import assert from 'assert';
import fs from 'fs-extra';
import path from 'path';
import { printBundleSizes, ProjectUtils } from 'xdl';

import { resolveEntryPoint } from '../../../xdl/build/internal';
import { assertFolderEmptyAsync } from './utils/CreateApp';

type Options = {
  clear?: boolean;
  bundleOutput?: string;
  sourcemapOutput?: string;
  assetsOutput?: string;
  maxWorkers?: number;
  dev?: boolean;
  platform: 'ios' | 'android';
};

function parseOptions(options: Partial<Options>): Options {
  assert(options.platform, '--platform must be provided');
  assert(['ios', 'android'].includes(options.platform), '--platform must be one of [android|ios]');
  if (options.maxWorkers != null) {
    assert(options.maxWorkers > 0, '--max-workers must be greater than zero');
  }

  return {
    clear: options.clear,
    bundleOutput: options.bundleOutput,
    sourcemapOutput: options.sourcemapOutput,
    assetsOutput: options.assetsOutput,
    maxWorkers: options.maxWorkers,
    dev: options.dev,
    platform: options.platform,
  };
}

export async function actionAsync(projectRoot: string, args: Partial<Options>) {
  const options = parseOptions(args);

  const config = getConfig(projectRoot, { skipSDKVersionRequirement: true });

  const outputDir = options.bundleOutput
    ? path.dirname(options.bundleOutput)
    : // Create a default build folder `ios-build`, `android-build`, to match `web-build`.
      path.join(projectRoot, `${options.platform}-build`);

  // Ensure the output directory is created
  await fs.ensureDir(outputDir);

  // Clear out the folder
  await assertFolderEmptyAsync({
    projectRoot: outputDir,
    folderName: path.relative(projectRoot, outputDir),
    // Always overwrite files, this is inline with most bundler tooling.
    overwrite: true,
  });

  // Create a default bundle name
  const defaultBundleName = options.platform === 'ios' ? 'index.jsbundle' : 'index.android.bundle';

  const [results] = await bundleAsync(
    projectRoot,
    config.exp,
    {
      resetCache: options.clear,
      logger: ProjectUtils.getLogger(projectRoot),
    },
    [options.platform].map(platform => ({
      bundleOutput: options.bundleOutput || path.join(outputDir, defaultBundleName),
      assetOutput: options.assetsOutput || outputDir,
      platform,
      // Use Expo's entry point resolution to ensure all commands act the same way.
      entryPoint: resolveEntryPoint(projectRoot, platform),
      sourcemapOutput: options.sourcemapOutput || path.join(outputDir, defaultBundleName + '.map'),
      // This prevents the absolute path from being shown in the source code, shouts out to Satya.
      sourcemapSourcesRoot: projectRoot,
      // For now, just use dev for both dev and minify
      dev: !!options.dev,
      minify: !options.dev,
    }))
  );

  // Pretty print the resulting sizes
  printBundleSizes({ [options.platform]: results });
}
