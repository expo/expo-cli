import { Command } from 'commander';
import configureIOSProjectAsync from './apply/configureIOSProjectAsync';
import configureAndroidProjectAsync from './apply/configureAndroidProjectAsync';
import { logConfigWarningsAndroid, logConfigWarningsIOS } from './utils/logConfigWarnings';

type Options = {
  platform?: string;
  // todo: probably let people pass an ios or android directory in case they don't follow the convention
};

export default function (program: Command) {
  program
    .command('apply [project-dir]')
    .option(
      '-p, --platform [platform]',
      'Configure only the given platform ("ios" or "android")',
      /^(android|ios)$/i
    )
    // .option('--interactive', 'TODO: provide a flag where people can see a diff for each option to be applied and approve or reject it')
    .description(
      'Take the configuration from app.json or app.config.js and apply it to a native project.'
    )
    .asyncActionProjectDir(async (projectDir: string, options: Options) => {
      if (!options.platform || options.platform === 'ios') {
        await configureIOSProjectAsync(projectDir);
        logConfigWarningsIOS();
      }

      if (!options.platform || options.platform === 'android') {
        await configureAndroidProjectAsync(projectDir);
        logConfigWarningsAndroid();
      }
    });
}
