import { getConfig, getPrebuildConfig, ProjectConfig } from '@expo/config';
import { BaseModPlugins } from '@expo/config-plugins';
import { evalModsAsync } from '@expo/config-plugins/build/plugins/mod-compiler';
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
    config = await profileMethod(getPrebuildConfig)({
      projectRoot,
      platforms: ['ios', 'android'],
    });
  } else if (options.type === 'prebuild-dryrun') {
    config = await profileMethod(getPrebuildConfig)({
      projectRoot,
      platforms: ['ios', 'android'],
    });

    config.exp = BaseModPlugins.withIOSEntitlementsPlistBaseMod(config.exp, { dryRun: true });
    config.exp = BaseModPlugins.withIOSInfoPlistBaseMod(config.exp, { dryRun: true });

    delete config.exp.mods.android.dangerous;
    for (const key of Object.keys(config.exp.mods.ios)) {
      if (!['entitlements', 'infoPlist'].includes(key)) {
        delete config.exp.mods.ios[key];
      }
    }

    await evalModsAsync(config.exp, {
      projectRoot,
      platforms: ['ios'],
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
