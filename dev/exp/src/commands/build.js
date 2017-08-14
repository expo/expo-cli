/**
 * @flow
 */

import BaseBuilder from './build/BaseBuilder';
import IOSBuilder from './build/IOSBuilder';
import AndroidBuilder from './build/AndroidBuilder';
import BuildError from './build/BuildError';

export default (program: any) => {
  program
    .command('build:ios [project-dir]')
    .alias('bi')
    .option('-c, --clear-credentials', 'Clear stored credentials.')
    .option('-t --build-type <build>', 'Type of build: [archive|simulator].', /^(archive|simulator)$/i, 'archive')
    .description(
      'Build a standalone IPA for your project, signed and ready for submission to the Apple App Store.'
    )
    .allowNonInteractive()
    .asyncActionProjectDir((projectDir, options) => {
      const iosBuilder = new IOSBuilder(projectDir, options);
      return iosBuilder.command();
    });

  program
    .command('build:android [project-dir]')
    .alias('ba')
    .option('-c, --clear-credentials', 'Clear stored credentials.')
    .description(
      'Build a standalone APK for your project, signed and ready for submission to the Google Play Store.'
    )
    .allowNonInteractive()
    .asyncActionProjectDir((projectDir, options) => {
      const androidBuilder = new AndroidBuilder(projectDir, options);
      return androidBuilder.command();
    });

  program
    .command('build:status [project-dir]')
    .alias('bs')
    .description(
      `Gets the status of a current (or most recently finished) build for your project.`
    )
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
