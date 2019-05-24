import { Project, ProjectUtils, AssetUtils } from '@expo/xdl';
import log from '../log';

export async function action(projectDir = './', options = {}) {
  const { exp } = await ProjectUtils.readConfigJsonAsync(projectDir);
  if (exp === null) {
    log.warn('No Expo configuration found. Are you sure this is a project directory?');
    process.exit(1);
  }

  const hasUnoptimizedAssets = await AssetUtils.hasUnoptimizedAssetsAsync(projectDir, options);
  if (!options.save && hasUnoptimizedAssets) {
    log.warn('This will overwrite the original assets.');
  }

  // Validate custom quality
  const defaultQuality = 60;
  const { quality: strQuality } = options;

  const quality = Number(strQuality);
  const validQuality = Number.isInteger(quality) && quality > 0 && quality <= 100;
  if (strQuality !== undefined && !validQuality) {
    throw new Error('Invalid value for --quality flag. Must be an integer between 1 and 100.');
  }
  const outputQuality = validQuality ? quality : defaultQuality;
  options.quality = outputQuality;
  await Project.optimizeAsync(projectDir, options);
}

export default program => {
  program
    .command('optimize [project-dir]')
    .alias('o')
    .description('Compress the assets in your Expo project')
    .option('-s, --save', 'Save the original assets with a .orig extension')
    .option(
      '--quality [number]',
      'Specify the quality the compressed image is reduced to. Default is 60'
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
};
