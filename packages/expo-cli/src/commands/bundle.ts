import { getConfig, getDefaultTarget, ProjectTarget } from '@expo/config';
import { buildBundlesAsync } from '@expo/xdl/build/Project';
import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';

import { SilentError } from '../CommandError';
import log from '../log';
import * as CreateApp from './utils/CreateApp';

type Options = {
  outputDir: string;
  dev: boolean;
  quiet: boolean;
  target?: ProjectTarget;
  force: boolean;
};

export async function action(projectDir: string, options: Options) {
  log.warn(`⚠️  the  expo bundle is experimental and subject to breaking changes`);
  // Ensure the output directory is created
  const outputPath = path.resolve(projectDir, options.outputDir);
  await fs.ensureDir(outputPath);

  // Assert if the folder has contents
  if (
    !(await CreateApp.assertFolderEmptyAsync({
      projectRoot: outputPath,
      folderName: options.outputDir,
      overwrite: options.force,
    }))
  ) {
    const message = `Try using a new directory name with ${log.chalk.bold(
      '--output-dir'
    )}, moving these files, or using ${log.chalk.bold('--force')} to overwrite them.`;
    log.newLine();
    log.nested(message);
    log.newLine();
    throw new SilentError(message);
  }

  const { exp } = getConfig(projectDir, { isPublicConfig: true });
  await buildBundlesAsync({
    projectRoot: projectDir,
    outputDir: options.outputDir,
    exp,
    options: {
      isDev: options.dev,
      publishOptions: {
        target: options.target ?? getDefaultTarget(projectDir),
      },
    },
  });
  log(`Export was successful. Your exported files can be found in ${options.outputDir}`);
}

export default function (program: Command) {
  program
    .command('bundle [path]')
    .description('Export the static files of the app for hosting it on a web server')
    .helpGroup('core')
    .option(
      '--output-dir <dir>',
      'The directory to export the static files to. Default directory is `dist`',
      'dist'
    )
    .option('--dev', 'Configure static files for developing locally using a non-https server')
    .option('-f, --force', 'Overwrite files in output directory without prompting for confirmation')
    .option('-q, --quiet', 'Suppress verbose output.')
    .option(
      '-t, --target [env]',
      'Target environment for which this export is intended. Options are `managed` or `bare`.'
    )
    .asyncActionProjectDir(action, { checkConfig: true });
}
