import { UrlUtils } from '@expo/xdl';
import program from 'commander';

import AndroidBuilder from './AndroidBuilder';
import log from '../../log';
import CommandError from '../../CommandError';
import { askBuildType } from './utils';
import { AndroidOptions } from './BaseBuilder.types';
import maybeBailOnWorkflowWarning from './maybeBailOnWorkflowWarning';

export default async function buildAndroid(projectDir: string, options: AndroidOptions) {
  if (options.generateKeystore) {
    log.warn(
      `The --generate-keystore flag is deprecated and does not do anything. A Keystore will always be generated on the Expo servers if it's missing.`
    );
  }
  if (!options.skipWorkflowCheck) {
    if (
      await maybeBailOnWorkflowWarning({
        projectDir,
        platform: 'android',
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
    apk: 'Build a package to deploy to the store or install directly on Android devices',
    'app-bundle': 'Build an optimized bundle for the store',
  });
  const androidBuilder = new AndroidBuilder(projectDir, options);
  return androidBuilder.command();
}
