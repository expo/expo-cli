import { Detach } from '@expo/xdl';

async function action(projectDir, options) {
  await Detach.prepareDetachedBuildAsync(projectDir, options);
}

export default program => {
  program
    .command('prepare-detached-build [project-dir]')
    .option('--platform [platform]', 'Detached project platform.')
    .option('--skipXcodeConfig [bool]', '[iOS only] If true, do not configure the Xcode project.')
    .description('Prepares a detached project for building.')
    .asyncActionProjectDir(action, true);
};
