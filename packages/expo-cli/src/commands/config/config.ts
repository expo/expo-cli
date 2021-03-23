import { getConfig, ProjectConfig } from '@expo/config';
import { Command } from 'commander';

import Log from '../../log';
import { getModdedConfigAsync, logConfig } from '../eject/configureProjectAsync';
import { profileMethod } from '../utils/profileMethod';

type Options = {
  modded: boolean;
  manifest: boolean;
  full: boolean;
};

async function actionAsync(projectRoot: string, options: Options) {
  let config: ProjectConfig;
  if (options.modded) {
    config = await getModdedConfigAsync({
      projectRoot,
      platforms: ['ios', 'android'],
    });
  } else if (options.manifest) {
    config = getConfig(projectRoot, {
      skipSDKVersionRequirement: true,
      isPublicConfig: true,
    });
  } else {
    config = getConfig(projectRoot, {
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
    .option('--modded', 'Print the modded config used in prebuild')
    .option('--manifest', 'Print the public config used for publishing')
    .option('--full', 'Include all project config data')
    .asyncActionProjectDir(profileMethod(actionAsync));
}
