import { Command } from 'commander';
import configureIOSProjectAsync from './apply/configureIOSProjectAsync';
import configureAndroidProjectAsync from './apply/configureAndroidProjectAsync';

type Options = {
  platform?: string;
  // todo: probably let people pass an ios or android directory in case they don't follow the convention
};

export default function(program: Command) {
  program
    .command('apply [project-dir]')
    .option('--platform [platform]', 'Configure only the given platform ("ios" or "android")')
    .description(
      'Take the configuration from app.json or app.config.js and apply it to a native project.'
    )
    .asyncActionProjectDir(
      async (projectDir: string, options: Options) => {
        if (!options.platform || options.platform === 'ios') {
          await configureIOSProjectAsync(projectDir);
        }

        if (!options.platform || options.platform === 'android') {
          await configureAndroidProjectAsync(projectDir);
        }
      },
      /* skipProjectValidation: */ true,
      /* skipAuthCheck: */ true
    );
}
