import { getConfig, getPrebuildConfig, ProjectConfig } from '@expo/config';
import { compileModsAsync } from '@expo/config-plugins/build/plugins/mod-compiler';
import { Command } from 'commander';

import CommandError from '../../CommandError';
import Log from '../../log';
import { logConfig } from '../eject/configureProjectAsync';
import { profileMethod } from '../utils/profileMethod';

type Options = {
  type?: string;
  full: boolean;
};

async function actionAsync(projectRoot: string, options: Options) {
  let config: ProjectConfig;

  if (options.type === 'prebuild') {
    config = profileMethod(getPrebuildConfig)(projectRoot, {
      platforms: ['ios', 'android'],
    });
  } else if (options.type === 'introspect') {
    config = profileMethod(getPrebuildConfig)(projectRoot, {
      platforms: ['ios', 'android'],
    });

    await compileModsAsync(config.exp, {
      projectRoot,
      introspect: true,
      platforms: ['ios', 'android'],
    });
    // @ts-ignore
    delete config.modRequest;
    // @ts-ignore
    delete config.modResults;
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
    .option('-t, --type <type>', 'Type of config to show. Options: public, prebuild, introspect')
    .option('--full', 'Include all project config data')
    .asyncActionProjectDir(profileMethod(actionAsync));
}
