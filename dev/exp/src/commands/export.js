/**
 * @flow
 */
import validator from 'validator';
import path from 'path';
import { Project } from 'xdl';

import log from '../log';
import { installExitHooks } from '../exit';
import CommandError from '../CommandError';

export async function action(projectDir: string, options: Options = {}) {
  if (!options.publicUrl) {
    throw new CommandError('MISSING_PUBLIC_URL', 'Missing required option: --public-url');
  }
  if (!validator.isURL(options.publicUrl, { protocols: ['https'] })) {
    throw new CommandError('INVALID_PUBLIC_URL', '--public-url must be a valid HTTPS URL.');
  }
  const status = await Project.currentStatus(projectDir);

  let startedOurOwn = false;
  if (status !== 'running') {
    log(
      `Unable to find an existing ${options.parent
        .name} instance for this directory, starting a new one...`
    );

    installExitHooks(projectDir);

    const startOpts = { reset: options.clear, nonPersistent: true };
    if (options.maxWorkers) {
      startOpts.maxWorkers = options.maxWorkers;
    }
    log('Exporting your app...');
    await Project.startAsync(projectDir, startOpts, !options.quiet);
    startedOurOwn = true;
  }

  // Make outputDir an absolute path if it isnt already
  const absoluteOutputDir = path.resolve(process.cwd(), options.outputDir);
  await Project.exportForAppHosting(projectDir, options.publicUrl, absoluteOutputDir);

  if (startedOurOwn) {
    log('Terminating server processes.');
    await Project.stopAsync(projectDir);
  }
  log(`Export was successful. Your exported files can be found in ${options.outputDir}`);
}

export default (program: any) => {
  program
    .command('export [project-dir]')
    .description('Exports the static files of the app for hosting it on a web server.')
    .option('-p, --public-url <url>', 'The public url that will host the static files. (Required)')
    .option(
      '--output-dir <dir>',
      'The directory to export the static files to. Default directory is `dist`',
      'dist'
    )
    .option('-q, --quiet', 'Suppress verbose output from the React Native packager.')
    .option('--max-workers [num]', 'Maximum number of tasks to allow Metro to spawn.')
    .asyncActionProjectDir(action, false, true);
};
