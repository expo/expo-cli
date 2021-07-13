import type { Command } from 'commander';
import { Detach } from 'xdl';

type Options = {
  platform?: string;
  skipXcodeConfig: boolean;
};

async function action(projectRoot: string, options: Options) {
  await Detach.prepareDetachedBuildAsync(projectRoot, options);
}

export default function (program: Command) {
  program
    .command('prepare-detached-build [path]')
    .description('Prepare a detached project for building')
    .helpGroup('internal')
    .option('--platform [platform]', 'detached project platform')
    .option('--skipXcodeConfig [bool]', '[iOS only] if true, do not configure Xcode project')
    .asyncActionProjectDir(action);
}
