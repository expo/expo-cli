import { Detach } from 'xdl';

async function action(projectDir, options) {
  await Detach.bundleAssetsAsync(projectDir, options);
}

export default program => {
  program
    .command('bundle-assets [project-dir]')
    .option('--dest [dest]', 'Destination directory for assets')
    .option('--platform [platform]', 'detached project platform')
    .description(
      'Bundles assets for a detached app. This command should be executed from xcode or gradle.'
    )
    .asyncActionProjectDir(action, true);
};
