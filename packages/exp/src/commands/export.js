/**
 * @flow
 */
import fs from 'fs-extra';
import validator from 'validator';
import path from 'path';
import { Project, UrlUtils } from 'xdl';

import log from '../log';
import { installExitHooks } from '../exit';
import CommandError from '../CommandError';

export async function action(projectDir: string, options: Options = {}) {
  const outputPath = path.resolve(projectDir, options.outputDir);
  if (fs.existsSync(outputPath)) {
    throw new CommandError(
      'OUTPUT_DIR_EXISTS',
      `Output directory ${outputPath} already exists. Aborting export.`
    );
  }
  if (!options.publicUrl) {
    throw new CommandError('MISSING_PUBLIC_URL', 'Missing required option: --public-url');
  }
  // If we are not in dev mode, ensure that url is https
  if (!options.dev && !UrlUtils.isHttps(options.publicUrl)) {
    throw new CommandError('INVALID_PUBLIC_URL', '--public-url must be a valid HTTPS URL.');
  } else if (!validator.isURL(options.publicUrl, { protocols: ['http', 'https'] })) {
    console.warn(`Dev Mode: publicUrl ${options.publicUrl} does not conform to HTTP format.`);
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
  const exportOptions = {
    dumpAssetmap: options.dumpAssetmap,
    dumpSourcemap: options.dumpSourcemap,
    isDev: options.dev,
  };
  const absoluteOutputDir = path.resolve(process.cwd(), options.outputDir);
  await Project.exportForAppHosting(
    projectDir,
    options.publicUrl,
    options.assetUrl,
    absoluteOutputDir,
    exportOptions
  );

  if (startedOurOwn) {
    log('Terminating server processes.');
    await Project.stopAsync(projectDir);
  }
  log(`Export was successful. Your exported files can be found in ${options.outputDir}`);
}

function collect(val, memo) {
  memo.push(val);
  return memo;
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
    .option(
      '-a, --asset-url <url>',
      "The absolute or relative url that will host the asset files. Default is './assets', which will be resolved against the public-url.",
      './assets'
    )
    .option('-d, --dump-assetmap', 'Dump the asset map for further processing.')
    .option('--dev', 'Configures static files for developing locally using a non-https server')
    .option('--s, --dump-sourcemap', 'Dump the source map for debugging the JS bundle.')
    .option('-q, --quiet', 'Suppress verbose output from the React Native packager.')
    .option('--max-workers [num]', 'Maximum number of tasks to allow Metro to spawn.')
    .asyncActionProjectDir(action, false, true);

  program
    .command('export:merge [project-dir]')
    .description('Merge multiple exported apps into one.')
    .option('-s, --source-dir [dir]', 'A repeatable source directory', collect, [])
    .option(
      '--output-dir <dir>',
      'The directory to export the static files to. Default directory is `dist`',
      'dist'
    )
    .asyncActionProjectDir(async (projectDir, options) => {
      const outputPath = path.resolve(projectDir, options.outputDir);
      if (fs.existsSync(outputPath)) {
        throw new CommandError(
          'OUTPUT_DIR_EXISTS',
          `Output directory ${outputPath} already exists. Aborting export:merge.`
        );
      }

      if (!options.outputDir) {
        throw new CommandError('MISSING_OUTPUT_DIR', 'outputDir must be specified.');
      }
      if (!options.sourceDir || options.sourceDir.length === 0) {
        throw new CommandError('MISSING_SOURCE_DIR', 'At least one sourceDir must be specified.');
      }

      log(`Starting project merge of ${JSON.stringify(options.sourceDir)} to ${options.outputDir}`);
      await Project.mergeAppDistributions(projectDir, options.sourceDir, options.outputDir);
      log(`Project merge was successful. Your merged files can be found in ${options.outputDir}`);
    });
};
