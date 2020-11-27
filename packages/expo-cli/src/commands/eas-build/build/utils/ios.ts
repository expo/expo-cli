import { IOSConfig } from '@expo/config-plugins';
import { ExpoConfig } from '@expo/config-types';
import once from 'lodash/once';

import log from '../../../../log';
import prompts from '../../../../prompts';

export const getBundleIdentifier = once(_getBundleIdentifier);

async function _getBundleIdentifier(projectDir: string, manifest: ExpoConfig): Promise<string> {
  const bundleIdentifierFromPbxproj = IOSConfig.BundleIdenitifer.getBundleIdentifierFromPbxproj(
    projectDir
  );
  const bundleIdentifierFromConfig = IOSConfig.BundleIdenitifer.getBundleIdentifier(manifest);
  if (bundleIdentifierFromPbxproj !== null && bundleIdentifierFromConfig !== null) {
    if (bundleIdentifierFromPbxproj === bundleIdentifierFromConfig) {
      return bundleIdentifierFromPbxproj;
    } else {
      log.newLine();
      log(
        log.chalk.yellow(
          `We detected that your Xcode project is configured with a different bundle identifier than the one defined in app.json/app.config.js.
If you choose the one defined in app.json/app.config.js we'll automatically configure your Xcode project with it.
However, if you choose the one defined in the Xcode project you'll have to update app.json/app.config.js on your own.
Otherwise, you'll see this prompt again in the future.`
        )
      );
      log.newLine();
      const { bundleIdentifier } = await prompts({
        type: 'select',
        name: 'bundleIdentifier',
        message: 'Which bundle identifier should we use?',
        choices: [
          {
            title: `Defined in the Xcode project: ${log.chalk.bold(bundleIdentifierFromPbxproj)}`,
            value: bundleIdentifierFromPbxproj,
          },
          {
            title: `Defined in app.json/app.config.js: ${log.chalk.bold(
              bundleIdentifierFromConfig
            )}`,
            value: bundleIdentifierFromConfig,
          },
        ],
      });
      return bundleIdentifier;
    }
  } else if (bundleIdentifierFromPbxproj === null && bundleIdentifierFromConfig === null) {
    throw new Error('Please define "expo.ios.bundleIdentifier" in app.json/app.config.js');
  } else {
    if (bundleIdentifierFromPbxproj !== null) {
      log(
        `Using ${log.chalk.bold(
          bundleIdentifierFromPbxproj
        )} as the bundle identifier (read from the Xcode project).`
      );
      return bundleIdentifierFromPbxproj;
    } else {
      // bundleIdentifierFromConfig is never null in this case
      // the following line is to satisfy TS
      const bundleIdentifier = bundleIdentifierFromConfig ?? '';
      log(
        `Using ${log.chalk.bold(
          bundleIdentifier
        )} as the bundle identifier (read from app.json/app.config.js).
We'll automatically configure your Xcode project using this value.`
      );
      return bundleIdentifier;
    }
  }
}
