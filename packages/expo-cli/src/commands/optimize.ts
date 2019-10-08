import { Command } from 'commander';
import { Project, ProjectUtils, AssetUtils } from '@expo/xdl';

import log from '../log';

type Options = {
  save?: boolean;
  quality?: string;
  include?: string;
  exclude?: string;
};

export async function action(projectDir = './', options: Options = {}) {
  const { exp } = await ProjectUtils.readConfigJsonAsync(projectDir);
  if (exp === null) {
    log.warn('No Expo configuration found. Are you sure this is a project directory?');
    process.exit(1);
  }

  const optimizationOptions = {
    ...options,
    quality: parseQuality(options),
  };

  const hasUnoptimizedAssets = await AssetUtils.hasUnoptimizedAssetsAsync(
    projectDir,
    optimizationOptions
  );
  if (!options.save && hasUnoptimizedAssets) {
    log.warn('This will overwrite the original assets.');
  }
  const optimizeOptions = await Project.optimizeAsync(projectDir, optimizationOptions);
}

function parseQuality(options: Options): number | undefined {
  const defaultQuality = 80;
  if (options.quality == null) {
    return undefined;
  }
  const quality = Number(options.quality);
  if (!(Number.isInteger(quality) && quality > 0 && quality <= 100)) {
    throw new Error('Invalid value for --quality flag. Must be an integer between 1 and 100.');
  }
  return quality;
}

export default function(program: Command) {
  program
    .command('optimize [project-dir]')
    .alias('o')
    .description('Compress the assets in your Expo project')
    .option('-s, --save', 'Save the original assets with a .orig extension')
    .option(
      '--quality [number]',
      'Specify the quality the compressed image is reduced to. Default is 80'
    )
    .option(
      '--include [pattern]',
      'Include only assets that match this glob pattern relative to the project root'
    )
    .option(
      '--exclude [pattern]',
      'Exclude all assets that match this glob pattern relative to the project root'
    )
    .allowOffline()
    .asyncAction(action);
}
