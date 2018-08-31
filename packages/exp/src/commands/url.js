import chalk from 'chalk';
import fp from 'lodash/fp';

import { Project, UrlUtils } from 'xdl';

import CommandError from '../CommandError';
import log from '../log';
import urlOpts from '../urlOpts';
import printRunInstructionsAsync from '../printRunInstructionsAsync';

const logArtifactUrl = platform => async (projectDir, options) => {
  if (options.publicUrl && !UrlUtils.isHttps(options.publicUrl)) {
    throw new CommandError('INVALID_PUBLIC_URL', '--public-url must be a valid HTTPS URL.');
  }
  const res = await Project.buildAsync(projectDir, {
    current: false,
    mode: 'status',
    ...(options.publicUrl ? { publicUrl: options.publicUrl } : {}),
  });
  const url = fp.compose(
    fp.get(['artifacts', 'url']),
    fp.head,
    fp.filter(job => platform && job.platform === platform),
    fp.getOr([], 'jobs')
  )(res);
  if (url) {
    log.nested(url);
  } else {
    throw new Error(`No ${platform} binary file found. Use "exp build:${platform}" to create one.`);
  }
};

async function action(projectDir, options) {
  await urlOpts.optsAsync(projectDir, options);

  if ((await Project.currentStatus(projectDir)) !== 'running') {
    throw new CommandError(
      'NOT_RUNNING',
      `Project is not running. Please start it with \`${options.parent.name} start\`.`
    );
  }
  const url = await UrlUtils.constructManifestUrlAsync(projectDir);

  log.newLine();
  urlOpts.printQRCode(url);

  log('Your URL is\n\n' + chalk.underline(url) + '\n');
  log.raw(url);

  await printRunInstructionsAsync();
  await urlOpts.handleMobileOptsAsync(projectDir, options);
}

export default program => {
  program
    .command('url [project-dir]')
    .alias('u')
    .description('Displays the URL you can use to view your project in Expo')
    .urlOpts()
    .allowOffline()
    .asyncActionProjectDir(action, /* skipProjectValidation: */ true, /* skipAuthCheck: */ true);

  program
    .command('url:ipa [project-dir]')
    .option('--public-url <url>', 'Url for an externally hosted app.')
    .description('Displays the standalone iOS binary URL you can use to download your app binary')
    .asyncActionProjectDir(logArtifactUrl('ios'), true);

  program
    .command('url:apk [project-dir]')
    .option('--public-url <url>', 'Url for an externally hosted app.')
    .description(
      'Displays the standalone Android binary URL you can use to download your app binary'
    )
    .asyncActionProjectDir(logArtifactUrl('android'), true);
};
