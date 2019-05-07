import { Project, ProjectUtils, AssetUtils } from 'xdl';
import prompt from '../prompt';
import log from '../log';

export async function action(projectDir = './', options = {}) {
  const { exp } = await ProjectUtils.readConfigJsonAsync(projectDir);
  if (exp === null) {
    log.warn('No Expo configuration found. Are you sure this is a project directory?');
    process.exit(1);
  }

  const hasUnoptimizedAssets = await AssetUtils.hasUnoptimizedAssetsAsync(projectDir, options);
  const nonInteractive = options.parent && options.parent.nonInteractive;
  const shouldPromptUser = !options.save && !nonInteractive && hasUnoptimizedAssets;
  if (shouldPromptUser) {
    log.warn('Running this command will overwrite the original assets.');
    const { saveOriginals } = await prompt({
      type: 'confirm',
      name: 'saveOriginals',
      message: 'Do you want to save a backup of each file?',
    });
    if (saveOriginals) {
      options.save = true;
    }
  }
  await Project.optimizeAsync(projectDir, options);
}

export default program => {
  program
    .command('optimize [project-dir]')
    .alias('o')
    .description('Compress the assets in your Expo project')
    .option('-s, --save', 'Save the original assets with a .expo extension')
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
