import { getConfig, ProjectConfig } from '@expo/config';
import { compileModsAsync } from '@expo/config-plugins/build/plugins/mod-compiler';
import { getPrebuildConfigAsync } from '@expo/prebuild-config';

import CommandError from '../../../CommandError';
import Log from '../../../log';
import { warnAboutLocalCLI } from '../../../utils/migration';
import { logConfig } from '../../eject/configureProjectAsync';
import { profileMethod } from '../../utils/profileMethod';

type Options = {
  type?: string;
  full: boolean;
  json?: boolean;
};

export async function actionAsync(projectRoot: string, options: Options) {
  // Don't break the existing functionality.
  if (!options.json) {
    warnAboutLocalCLI(projectRoot, { localCmd: 'config' });
  }
  let config: ProjectConfig;

  if (options.type === 'prebuild') {
    config = await profileMethod(getPrebuildConfigAsync)(projectRoot, {
      platforms: ['ios', 'android'],
    });
  } else if (options.type === 'introspect') {
    config = await profileMethod(getPrebuildConfigAsync)(projectRoot, {
      platforms: ['ios', 'android'],
    });

    await compileModsAsync(config.exp, {
      projectRoot,
      introspect: true,
      platforms: ['ios', 'android'],
      assertMissingModProviders: false,
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

  const configOutput = options.full ? config : config.exp;

  if (!options.json) {
    Log.log();
    logConfig(configOutput);
    Log.log();
  } else {
    Log.nested(JSON.stringify(configOutput));
  }
}
