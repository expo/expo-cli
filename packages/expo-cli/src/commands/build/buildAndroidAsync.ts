import program from 'commander';

import Log from '../../log';
import AndroidBuilder from './AndroidBuilder';
import type { AndroidOptions } from './BaseBuilder.types';
import { assertPublicUrl, assertReleaseChannel, maybeBailOnWorkflowWarning } from './utils';

export async function actionAsync(projectRoot: string, options: AndroidOptions) {
  if (options.generateKeystore) {
    Log.warn(
      `The --generate-keystore flag is deprecated and does not do anything. A Keystore will always be generated on the Expo servers if it's missing.`
    );
  }
  if (!options.skipWorkflowCheck) {
    if (
      await maybeBailOnWorkflowWarning({
        projectRoot,
        platform: 'android',
        nonInteractive: program.nonInteractive,
      })
    ) {
      return;
    }
  }

  assertPublicUrl(options.publicUrl);
  assertReleaseChannel(options.releaseChannel);

  const androidBuilder = new AndroidBuilder(projectRoot, options);
  return androidBuilder.command();
}
