/**
 * @flow
 */

import BaseBuilder from './build/BaseBuilder';
import IOSBuilder from './build/IOSBuilder';
import AndroidBuilder from './build/AndroidBuilder';
import BuildError from './build/BuildError';
import log from '../log';

export default (program: any) => {
  program
    .command('build:ios [project-dir]')
    .alias('bi')
    .option('-c, --clear-credentials', 'Clear stored credentials.')
    .option('-t --type <build>', 'Type of build: [archive|simulator].', /^(archive|simulator)$/i)
    .option('-f, --local-auth', 'Turn on local auth flow')
    .option('--expert-auth', "Don't log in to Apple, provide all of the files needed to build.")
    .option('--release-channel <channel-name>', 'Pull from specified release channel.', 'default')
    .option('--publish', 'Publish the project before building.')
    .description(
      'Build a standalone IPA for your project, signed and ready for submission to the Apple App Store.'
    )
    .allowNonInteractive()
    .asyncActionProjectDir((projectDir, options) => {
      if (options.localAuth || options.expertAuth) {
        log.warn(
          'DEPRECATED: --local-auth and --expert-auth are no-ops now, will be removed in future'
        );
      }
      let channelRe = new RegExp(/^[a-z\d][a-z\d._-]*$/);
      if (!channelRe.test(options.releaseChannel)) {
        log.error(
          'Release channel name can only contain lowercase letters, numbers and special characters . _ and -'
        );
        process.exit(1);
      }
      if (
        options.type !== undefined &&
        options.type !== 'archive' &&
        options.type !== 'simulator'
      ) {
        log.error('Build type must be one of {archive, simulator}');
        process.exit(1);
      }
      const iosBuilder = new IOSBuilder(projectDir, options);
      return iosBuilder.command();
    });

  program
    .command('build:android [project-dir]')
    .alias('ba')
    .option('-c, --clear-credentials', 'Clear stored credentials.')
    .option('--release-channel <channel-name>', 'Pull from specified release channel.', 'default')
    .option('--publish', 'Publish the project before building.')
    .description(
      'Build a standalone APK for your project, signed and ready for submission to the Google Play Store.'
    )
    .allowNonInteractive()
    .asyncActionProjectDir((projectDir, options) => {
      let channelRe = new RegExp(/^[a-z\d][a-z\d._-]*$/);
      if (!channelRe.test(options.releaseChannel)) {
        log.error(
          'Release channel name can only contain lowercase letters, numbers and special characters . _ and -'
        );
        process.exit(1);
      }
      const androidBuilder = new AndroidBuilder(projectDir, options);
      return androidBuilder.command();
    });

  program
    .command('build:status [project-dir]')
    .alias('bs')
    .description(`Gets the status of a current (or most recently finished) build for your project.`)
    .allowNonInteractive()
    .asyncActionProjectDir(async (projectDir, options) => {
      const builder = new BaseBuilder(projectDir, options);
      try {
        return await builder.checkStatus(false);
      } catch (e) {
        if (e instanceof BuildError) {
          return;
        }
        throw e;
      }
    });
};
