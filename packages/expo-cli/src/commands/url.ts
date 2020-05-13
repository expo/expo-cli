import { Command } from 'commander';
import chalk from 'chalk';
import fp from 'lodash/fp';
import { Project, UrlUtils } from '@expo/xdl';

import CommandError from '../CommandError';
import log from '../log';
import urlOpts, { URLOptions } from '../urlOpts';
import printRunInstructionsAsync from '../printRunInstructionsAsync';

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

  let res;
  if (process.env.EXPO_LEGACY_API === 'true') {
    res = await Project.buildAsync(projectDir, {
      current: false,
      mode: 'status',
      ...(options.publicUrl ? { publicUrl: options.publicUrl } : {}),
    });
  } else {
    res = await Project.getBuildStatusAsync(projectDir, {
      current: false,
      ...(options.publicUrl ? { publicUrl: options.publicUrl } : {}),
    });
  }
  const url = fp.compose(
    fp.get(['artifacts', 'url']),
    fp.head,
    fp.filter((job: any) => platform && job.platform === platform),
    fp.getOr([], 'jobs')
  )(res as any);
  if (url) {
    log.nested(url);
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

async function action(projectDir: string, options: ProjectUrlOptions & URLOptions) {
  await urlOpts.optsAsync(projectDir, options);

  if ((await Project.currentStatus(projectDir)) !== 'running') {
    throw new CommandError(
      'NOT_RUNNING',
      `Project is not running. Please start it with \`expo start\`.`
    );
  }
  const url = options.web
    ? await getWebAppUrlAsync(projectDir)
    : await UrlUtils.constructManifestUrlAsync(projectDir);

  log.newLine();
  urlOpts.printQRCode(url);

  log('Your URL is\n\n' + chalk.underline(url) + '\n');
  log.raw(url);

  if (!options.web) {
    await printRunInstructionsAsync();
    await urlOpts.handleMobileOptsAsync(projectDir, options);
  }
}

export default function (program: Command) {
  program
    .command('url [project-dir]')
    .alias('u')
    .option('-w, --web', 'Return the URL of the web app')
    .description('Displays the URL you can use to view your project in Expo')
    .urlOpts()
    .allowOffline()
    .asyncActionProjectDir(action);

  program
    .command('url:ipa [project-dir]')
    .option('--public-url <url>', 'The URL of an externally hosted manifest (for self-hosted apps)')
    .description('Displays the standalone iOS binary URL you can use to download your app binary')
    .asyncActionProjectDir(logArtifactUrl('ios'));

  program
    .command('url:apk [project-dir]')
    .option('--public-url <url>', 'The URL of an externally hosted manifest (for self-hosted apps)')
    .description(
      'Displays the standalone Android binary URL you can use to download your app binary'
    )
    .asyncActionProjectDir(logArtifactUrl('android'));
}
