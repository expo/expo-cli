import { Detach } from '@expo/xdl';
import { Command } from 'commander';

type Options = {
  dest?: string;
  platform?: string;
};

async function action(projectDir: string, options: Options) {
  await Detach.bundleAssetsAsync(projectDir, options);
}

export default function(program: Command) {
  program
    .command('bundle-assets [project-dir]')
    .option('--dest [dir]', 'Destination directory for assets')
    .option('--platform [platform]', 'Detached project platform')
    .description(
      'Bundles assets for a detached app. This command should be executed from xcode or gradle.'
    )
    .asyncActionProjectDir(action, true);
}
