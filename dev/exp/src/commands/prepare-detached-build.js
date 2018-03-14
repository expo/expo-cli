import { Detach } from 'xdl';

async function action(projectDir, options) {
  await Detach.prepareDetachedBuildAsync(projectDir, options);
}

export default program => {
  program
    .command('prepare-detached-build [project-dir]')
    .option('--platform [platform]', 'detached project platform')
    .option('--skipXcodeConfig [bool]', '[iOS only] if true, do not configure Xcode project')
    .description('Prepares a detached project for building')
    .asyncActionProjectDir(action, true, true);
};
