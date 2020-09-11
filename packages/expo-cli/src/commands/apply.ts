import { getConfig } from '@expo/config';
import JsonFile from '@expo/json-file';
import chalk from 'chalk';
import { Command } from 'commander';
import path from 'path';

import log from '../log';
import configureAndroidProjectAsync from './apply/configureAndroidProjectAsync';
import configureIOSProjectAsync from './apply/configureIOSProjectAsync';
import { logConfigWarningsAndroid, logConfigWarningsIOS } from './utils/logConfigWarnings';

type Options = {
  platform?: string;
  // todo: probably let people pass an ios or android directory in case they don't follow the convention
};

async function ensureConfigExistsAsync(projectRoot: string): Promise<void> {
  try {
    const config = getConfig(projectRoot, { skipSDKVersionRequirement: true });
    // If no config exists in the file system then we should generate one so the process doesn't fail.
    if (!config.dynamicConfigPath && !config.staticConfigPath) {
      // Don't check for a custom config path because the process should fail if a custom file doesn't exist.
      // Write the generated config.
      // writeConfigJsonAsync(projectRoot, config.exp);
      await JsonFile.writeAsync(
        path.join(projectRoot, 'app.json'),
        { expo: config.exp },
        { json5: false }
      );
    }
  } catch (error) {
    // TODO(Bacon): Currently this is already handled in the command
    log();
    log(chalk.red(error.message));
    log();
    process.exit(1);
  }
}

export default function (program: Command) {
  program
    .command('apply [path]')
    .option(
      '-p, --platform [platform]',
      'Configure only the given platform ("ios" or "android")',
      /^(android|ios)$/i
    )
    .helpGroup('experimental')
    // .option('--interactive', 'TODO: provide a flag where people can see a diff for each option to be applied and approve or reject it')
    .description('Sync the configuration from app.json to a native project')
    .asyncActionProjectDir(async (projectDir: string, options: Options) => {
      await ensureConfigExistsAsync(projectDir);

      if (!options.platform || options.platform === 'android') {
        await configureAndroidProjectAsync(projectDir);
        logConfigWarningsAndroid();
      }

      if (!options.platform || options.platform === 'ios') {
        await configureIOSProjectAsync(projectDir);
        logConfigWarningsIOS();
      }
    });
}
