import { Project, ProjectUtils } from 'xdl';
import prompt from '../prompt';
import log from '../log';

export async function action(projectDir = './', options = {}) {
  const { exp } = await ProjectUtils.readConfigJsonAsync(projectDir);
  if (exp === null) {
    log.warn('No Expo configuration found. Are you sure this is a project directory?');
    process.exit(1);
  }

  if (!options.save) {
    log.warn('Running this command will overwrite the original assets.');
    const { saveOriginals } = await prompt({
      type: 'confirm',
      name: 'saveOriginals',
      message: 'Do you want to save a copy of each file instead?',
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
    .option('-s, --save', 'Save the original assets with the extension .expo')
    .allowOffline()
    .asyncAction(action);
};
