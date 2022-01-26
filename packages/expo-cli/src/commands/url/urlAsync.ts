import chalk from 'chalk';
import type { Command } from 'commander';
import { ProjectSettings, UrlUtils } from 'xdl';

import CommandError from '../../CommandError';
import Log from '../../log';
import urlOpts, { URLOptions } from '../utils/urlOpts';
import printRunInstructionsAsync from './printRunInstructionsAsync';

type ProjectUrlOptions = Command & {
  web?: boolean;
};

export async function actionAsync(projectRoot: string, options: ProjectUrlOptions & URLOptions) {
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

async function assertProjectRunningAsync(projectRoot: string) {
  if ((await ProjectSettings.getCurrentStatusAsync(projectRoot)) !== 'running') {
    throw new CommandError(
      'NOT_RUNNING',
      `Project is not running. Please start it with \`expo start\`.`
    );
  }
}

async function getWebAppUrlAsync(projectRoot: string): Promise<string> {
  const url = await UrlUtils.constructWebAppUrlAsync(projectRoot);
  if (!url) {
    throw new CommandError(
      'NOT_RUNNING',
      `Webpack dev server is not running. Please start it with \`expo start:web\`.`
    );
  }
  return url;
}

function logUrl(url: string) {
  Log.newLine();

  urlOpts.printQRCode(url);

  Log.log('Your URL is\n\n' + chalk.underline(url) + '\n');
}
