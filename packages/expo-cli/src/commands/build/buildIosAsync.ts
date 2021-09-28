import program from 'commander';

import CommandError from '../../CommandError';
import type { IosOptions } from './BaseBuilder.types';
import IOSBuilder from './ios/IOSBuilder';
import { assertPublicUrl, assertReleaseChannel, maybeBailOnWorkflowWarning } from './utils';

export async function actionAsync(projectRoot: string, options: IosOptions) {
  if (!options.skipWorkflowCheck) {
    if (
      await maybeBailOnWorkflowWarning({
        projectRoot,
        platform: 'ios',
        nonInteractive: program.nonInteractive,
      })
    ) {
      return;
    }
  }
  if (options.skipCredentialsCheck && options.clearCredentials) {
    throw new CommandError(
      "--skip-credentials-check and --clear-credentials can't be used together"
    );
  }
  assertPublicUrl(options.publicUrl);
  assertReleaseChannel(options.releaseChannel);

  const iosBuilder = new IOSBuilder(projectRoot, options);
  return iosBuilder.command();
}
