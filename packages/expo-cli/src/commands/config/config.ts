import { getConfig, ProjectConfig } from '@expo/config';
import { Command } from 'commander';

import CommandError from '../../CommandError';
import Log from '../../log';
import { getModdedConfigAsync, logConfig } from '../eject/configureProjectAsync';
import { profileMethod } from '../utils/profileMethod';

type Options = {
  type?: string;
  full: boolean;
};

async function actionAsync(projectRoot: string, options: Options) {
  let config: ProjectConfig;

  if (options.type === 'prebuild') {
    config = await profileMethod(getModdedConfigAsync)({
      projectRoot,
      platforms: ['ios', 'android'],
    });
  } else if (options.type === 'public') {
    config = profileMethod(getConfig)(projectRoot, {
      skipSDKVersionRequirement: true,
      isPublicConfig: true,
    });
  } else if (options.type) {
    throw new CommandError(
      `Invalid option: --type ${options.type}. Valid options are: public, prebuild`
    );
  } else {
    config = profileMethod(getConfig)(projectRoot, {
      skipSDKVersionRequirement: true,
    });
  }

  Log.log();
  logConfig(options.full ? config : config.exp);
  Log.log();
}

export default function (program: Command) {
  program
    .command('config [path]')
    .description('Show the project config')
    .helpGroup('info')
    .option('-t, --type <type>', 'Type of config to show. Options: public, prebuild')
    .option('--full', 'Include all project config data')
    .asyncActionProjectDir(profileMethod(actionAsync));
}
