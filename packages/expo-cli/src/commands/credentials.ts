import * as ConfigUtils from '@expo/config';
import { CommanderStatic } from 'commander';
import fs from 'fs-extra';
import path from 'path';

import { Context, runCredentialsManagerStandalone } from '../credentials';
import {
  SelectAndroidExperience,
  SelectIosExperience,
  SelectPlatform,
} from '../credentials/views/Select';
import log from '../log';

type Options = {
  platform?: 'android' | 'ios';
  config?: string;
  parent?: {
    nonInteractive: boolean;
  };
};

export default function (program: CommanderStatic) {
  program
    .command('credentials:manager')
    .description('Manage your credentials')
    .helpGroup('credentials')
    .option('-p --platform <platform>', 'Platform: [android|ios]', /^(android|ios)$/i)
    .option('--config [file]', 'Specify a path to app.json or app.config.js')
    .asyncAction(async (options: Options) => {
      const projectDir = process.cwd();
      // @ts-ignore: This guards against someone passing --config without a path.
      if (options.config === true) {
        log('Please specify your custom config path:');
        log(
          log.chalk.green(`  expo credentials:manager --config ${log.chalk.cyan(`<app-config>`)}`)
        );
      }
      if (options.config) {
        const configPath = path.resolve(projectDir, options.config);
        if (!(await fs.pathExists(configPath))) {
          throw new Error(`File ${configPath} does not exist`);
        }
        ConfigUtils.setCustomConfigPath(projectDir, configPath);
      }
      const context = new Context();
      await context.init(projectDir, {
        nonInteractive: options.parent?.nonInteractive,
      });
      let mainpage;
      if (options.platform === 'android') {
        mainpage = new SelectAndroidExperience();
      } else if (options.platform === 'ios') {
        mainpage = new SelectIosExperience();
      } else {
        mainpage = new SelectPlatform();
      }
      await runCredentialsManagerStandalone(context, mainpage);
    }, /* skip project validation */ true);
}
