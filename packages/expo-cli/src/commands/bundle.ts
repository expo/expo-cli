import { getConfig, getDefaultTarget, ProjectTarget } from '@expo/config';
import { buildPublishBundlesAsync, shouldUseDevServer } from '@expo/xdl/build/Project';
import { saveAssetsAsync } from '@expo/xdl/build/ProjectAssets';
import { Command } from 'commander';
import fs from 'fs-extra';
import uniqBy from 'lodash/uniqBy';
import path from 'path';

import { SilentError } from '../CommandError';
import log from '../log';
import { Platform } from './eas-build/types';
import * as CreateApp from './utils/CreateApp';

const bundlePlatforms = [Platform.Android, Platform.iOS];

type Options = {
  outputDir: string;
  quiet: boolean;
  target?: ProjectTarget;
  force: boolean;
};
type PlatformMetadata = { bundle: string; assets: { path: string; ext: string; }[] };
type FileMetadata = {
  [key in Platform]: PlatformMetadata;
};
type Metadata = {
  version: number;
  bundler: 'metro';
  fileMetadata: FileMetadata;
};

/**
 * Create files with the following directory structure:
 *  outputDir
 *  ├── assets
 *  │   └── *
 *  ├── bundles
 *  │   ├── android.js
 *  │   └── ios.js
 *  └── metadata.json
 */
export async function action(projectDir: string, options: Options) {
  log.warn(`⚠️  'expo bundle' is experimental and subject to breaking changes`);
  // Ensure the output directory is created
  const outputPath = path.resolve(projectDir, options.outputDir);
  await fs.ensureDir(outputPath);

  // Assert if the folder has contents
  if (
    !(await CreateApp.assertFolderEmptyAsync({
      projectRoot: outputPath,
      folderName: options.outputDir,
      overwrite: options.force,
    }))
  ) {
    const message = `Try using a new directory name with ${log.chalk.bold(
      '--output-dir'
    )}, moving these files, or using ${log.chalk.bold('--force')} to overwrite them.`;
    log.newLine();
    log.nested(message);
    log.newLine();
    throw new SilentError(message);
  }

  const { exp } = getConfig(projectDir, { isPublicConfig: true });

  const assetPathToWrite = path.resolve(projectDir, path.join(options.outputDir, 'assets'));
  await fs.ensureDir(assetPathToWrite);
  const bundlesPathToWrite = path.resolve(projectDir, path.join(options.outputDir, 'bundles'));
  await fs.ensureDir(bundlesPathToWrite);

  const bundles = await buildPublishBundlesAsync(
    projectDir,
    { target: options.target ?? getDefaultTarget(projectDir) },
    {
      useDevServer: shouldUseDevServer(exp),
    }
  );

  // Write assets
  const uniqueAssets = uniqBy(
    [...bundles.android.assets, ...bundles.ios.assets],
    asset => asset.hash
  );
  await saveAssetsAsync(projectDir, uniqueAssets, options.outputDir);

  // Write bundles
  const bundlePaths = Object.fromEntries(
    bundlePlatforms.map(platform => [platform, path.join('bundles', `${platform}.js`)])
  );
  await Promise.all(
    bundlePlatforms.map(platform => {
      return fs.writeFile(
        path.resolve(projectDir, path.join(options.outputDir, bundlePaths[platform])),
        bundles[platform].code
      );
    })
  );

  // Build metadata.json
  const fileMetadata: {
    [key in Platform]: Partial<PlatformMetadata>;
  } = { android: {}, ios: {} };
  bundlePlatforms.forEach(platform => {
    bundles[platform].assets.forEach((asset: { type: string; fileHashes: string[] }) => {
      fileMetadata[platform].assets = asset.fileHashes.map(hash => {
        return { path: path.join('assets', hash), ext: asset.type };
      });
    });
    fileMetadata[platform].bundle = bundlePaths[platform];
  });
  const metadata: Metadata = {
    version: 0,
    bundler: 'metro',
    fileMetadata: fileMetadata as FileMetadata,
  };
  fs.writeFileSync(path.resolve(options.outputDir, 'metadata.json'), JSON.stringify(metadata));

  log(`Bundling was successful. Your files can be found in ${options.outputDir}`);
}

export default function (program: Command) {
  program
    .command('bundle [path]')
    .description('Experimental: Build the bundles for an app')
    .helpGroup('experimental')
    .option(
      '--output-dir <dir>',
      'The directory in which save the bundles. Default directory is `dist`',
      'dist'
    )
    .option('-f, --force', 'Overwrite files in output directory without prompting for confirmation')
    .option('-q, --quiet', 'Suppress verbose output.')
    .option(
      '-t, --target [env]',
      'Target environment for which this export is intended. Options are `managed` or `bare`.'
    )
    .asyncActionProjectDir(action, { checkConfig: true });
}
