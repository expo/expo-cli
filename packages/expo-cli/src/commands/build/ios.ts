import { UrlUtils } from '@expo/xdl';
import program from 'commander';

import IOSBuilder from './ios/IOSBuilder';
import log from '../../log';
import CommandError from '../../CommandError';
import { askBuildType } from './utils';
import { IosOptions } from './BaseBuilder.types';
import maybeBailOnWorkflowWarning from './maybeBailOnWorkflowWarning';

export default async function buildIos(projectDir: string, options: IosOptions) {
  if (!options.skipWorkflowCheck) {
    if (
      await maybeBailOnWorkflowWarning({
        projectDir,
        platform: 'ios',
        nonInteractive: program.nonInteractive,
      })
    ) {
      return;
    }
  }

  if (options.publicUrl && !UrlUtils.isHttps(options.publicUrl)) {
    throw new CommandError('INVALID_PUBLIC_URL', '--public-url must be a valid HTTPS URL.');
  }
  let channelRe = new RegExp(/^[a-z\d][a-z\d._-]*$/);
  if (!channelRe.test(options.releaseChannel)) {
    log.error(
      'Release channel name can only contain lowercase letters, numbers and special characters . _ and -'
    );
    process.exit(1);
  }
  options.type = await askBuildType(options.type, {
    archive: 'Deploy the build to the store',
    simulator: 'Run the build on a simulator',
  });
  const iosBuilder = new IOSBuilder(projectDir, options);
  return iosBuilder.command();
}
