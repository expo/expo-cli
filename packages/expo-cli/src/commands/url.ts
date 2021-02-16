import { ProjectSettings, UrlUtils } from '@expo/xdl';
import chalk from 'chalk';
import { Command } from 'commander';

import CommandError from '../CommandError';
import Log from '../log';
import printRunInstructionsAsync from '../printRunInstructionsAsync';
import urlOpts, { URLOptions } from '../urlOpts';
import { BuildJobFields, getBuildStatusAsync } from './build/getBuildStatusAsync';

type ProjectUrlOptions = Command & {
  web?: boolean;
};

type ArtifactUrlOptions = {
  publicUrl?: string;
};

const logArtifactUrl = (platform: 'ios' | 'android') => async (
  projectDir: string,
  options: ArtifactUrlOptions
) => {
  if (options.publicUrl && !UrlUtils.isHttps(options.publicUrl)) {
    throw new CommandError('INVALID_PUBLIC_URL', '--public-url must be a valid HTTPS URL.');
  }

  const result = await getBuildStatusAsync(projectDir, {
    current: false,
    ...(options.publicUrl ? { publicUrl: options.publicUrl } : {}),
  });

  const url = result.jobs?.filter((job: BuildJobFields) => job.platform === platform)[0]?.artifacts
    ?.url;
  if (url) {
    Log.nested(url);
  } else {
    throw new Error(
      `No ${platform} binary file found. Use "expo build:${platform}" to create one.`
    );
  }
};

async function getWebAppUrlAsync(projectDir: string): Promise<string> {
  const webAppUrl = await UrlUtils.constructWebAppUrlAsync(projectDir);
  if (!webAppUrl) {
    throw new CommandError(
      'NOT_RUNNING',
      `Expo web server is not running. Please start it with \`expo start:web\`.`
    );
  }
  return webAppUrl;
}

async function assertProjectRunningAsync(projectRoot: string) {
  if ((await ProjectSettings.getCurrentStatusAsync(projectRoot)) !== 'running') {
    throw new CommandError(
      'NOT_RUNNING',
      `Project is not running. Please start it with \`expo start\`.`
    );
  }
}

function logUrl(url: string) {
  Log.newLine();

  urlOpts.printQRCode(url);

  Log.log('Your URL is\n\n' + chalk.underline(url) + '\n');
}

async function action(projectRoot: string, options: ProjectUrlOptions & URLOptions) {
  await urlOpts.optsAsync(projectRoot, options);

  await assertProjectRunningAsync(projectRoot);

  const url = options.web
    ? await getWebAppUrlAsync(projectRoot)
    : await UrlUtils.constructDeepLinkAsync(projectRoot);

  logUrl(url);

  if (!options.web) {
    await printRunInstructionsAsync();
    await urlOpts.handleMobileOptsAsync(projectRoot, options);
  }
}

export default function (program: Command) {
  program
    .command('url [path]')
    .alias('u')
    .helpGroup('url')

    .option('-w, --web', 'Return the URL of the web app')
    .description('Log a URL for opening the project in Expo Go')
    .urlOpts()
    .allowOffline()
    .asyncActionProjectDir(action);

  program
    .command('url:ipa [path]')
    .helpGroup('url')
    .option('--public-url <url>', 'The URL of an externally hosted manifest (for self-hosted apps)')
    .description('Log the download URL for the standalone iOS binary')
    .asyncActionProjectDir(logArtifactUrl('ios'));

  program
    .command('url:apk [path]')
    .helpGroup('url')
    .option('--public-url <url>', 'The URL of an externally hosted manifest (for self-hosted apps)')
    .description('Log the download URL for the standalone Android binary')
    .asyncActionProjectDir(logArtifactUrl('android'));
}
