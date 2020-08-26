import { Detach } from '@expo/xdl';
import { Command } from 'commander';

type Options = {
  platform?: string;
  skipXcodeConfig: boolean;
};

async function action(projectDir: string, options: Options) {
  await Detach.prepareDetachedBuildAsync(projectDir, options);
}

export default function (program: Command) {
  program
    .command('prepare-detached-build [project-dir]')
    .option('--platform [platform]', 'detached project platform')
    .option('--skipXcodeConfig [bool]', '[iOS only] if true, do not configure Xcode project')
    .description('Prepares a detached project for building')
    .asyncActionProjectDir(action);
}
