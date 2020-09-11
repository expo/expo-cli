import { ProjectTarget, getDefaultTarget } from '@expo/config';
import { Project, UrlUtils } from '@expo/xdl';
import { Command } from 'commander';
import crypto from 'crypto';
import fs from 'fs-extra';
import got from 'got';
import path from 'path';
import stream from 'stream';
import tar from 'tar';
import { promisify } from 'util';
import validator from 'validator';

import CommandError from '../CommandError';
import log from '../log';
import prompt, { Question } from '../prompt';
import { createProgressTracker } from './utils/progress';

const pipeline = promisify(stream.pipeline);

/**
 * Download a tar.gz file and extract it to a folder.
 *
 * @param url remote URL to download.
 * @param destination destination folder to extract the tar to.
 */
async function downloadAndDecompressAsync(url: string, destination: string): Promise<string> {
  const downloadStream = got.stream(url).on('downloadProgress', createProgressTracker());

  await pipeline(downloadStream, tar.extract({ cwd: destination }));
  return destination;
}

type Options = {
  outputDir: string;
  assetUrl: string;
  publicUrl?: string;
  mergeSrcUrl: string[];
  mergeSrcDir: string[];
  dev: boolean;
  clear: boolean;
  quiet: boolean;
  target?: ProjectTarget;
  dumpAssetmap: boolean;
  dumpSourcemap: boolean;
  maxWorkers?: number;
  force: boolean;
};

export async function action(projectDir: string, options: Options) {
  if (!options.publicUrl) {
    throw new CommandError('MISSING_PUBLIC_URL', 'Missing required option: --public-url');
  }
  const outputPath = path.resolve(projectDir, options.outputDir);
  let overwrite = options.force;
  if (fs.existsSync(outputPath)) {
    if (!overwrite) {
      const question: Question = {
        type: 'confirm',
        name: 'action',
        message: `Output directory ${outputPath} already exists.\nThe following files and directories will be overwritten if they exist:\n- ${options.outputDir}/bundles\n- ${options.outputDir}/assets\n- ${options.outputDir}/ios-index.json\n- ${options.outputDir}/android-index.json\nWould you like to continue?`,
      };

      const { action } = await prompt(question);
      if (action) {
        overwrite = true;
      } else {
        throw new CommandError(
          'OUTPUT_DIR_EXISTS',
          `Output directory ${outputPath} already exists. Aborting export.`
        );
      }
    }
    if (overwrite) {
      log(`Removing old files from ${outputPath}`);
      const outputBundlesDir = path.resolve(outputPath, 'bundles');
      const outputAssetsDir = path.resolve(outputPath, 'assets');
      const outputAndroidJson = path.resolve(outputPath, 'android-index.json');
      const outputiOSJson = path.resolve(outputPath, 'ios-index.json');
      if (fs.existsSync(outputBundlesDir)) {
        fs.removeSync(outputBundlesDir);
      }
      if (fs.existsSync(outputAssetsDir)) {
        fs.removeSync(outputAssetsDir);
      }
      if (fs.existsSync(outputAndroidJson)) {
        fs.removeSync(outputAndroidJson);
      }
      if (fs.existsSync(outputiOSJson)) {
        fs.removeSync(outputiOSJson);
      }
    }
  }

  // If we are not in dev mode, ensure that url is https
  if (!options.dev && !UrlUtils.isHttps(options.publicUrl)) {
    throw new CommandError('INVALID_PUBLIC_URL', '--public-url must be a valid HTTPS URL.');
  } else if (!validator.isURL(options.publicUrl, { protocols: ['http', 'https'] })) {
    log.warn(`Dev Mode: publicUrl ${options.publicUrl} does not conform to HTTP format.`);
  }

  // Make outputDir an absolute path if it isnt already
  const exportOptions = {
    dumpAssetmap: options.dumpAssetmap,
    dumpSourcemap: options.dumpSourcemap,
    isDev: options.dev,
    publishOptions: {
      resetCache: !!options.clear,
      target: options.target ?? getDefaultTarget(projectDir),
    },
  };
  const absoluteOutputDir = path.resolve(process.cwd(), options.outputDir);
  await Project.exportForAppHosting(
    projectDir,
    options.publicUrl,
    options.assetUrl,
    absoluteOutputDir,
    exportOptions
  );

  // Merge src dirs/urls into a multimanifest if specified
  const mergeSrcDirs: string[] = [];

  // src urls were specified to merge in, so download and decompress them
  if (options.mergeSrcUrl.length > 0) {
    // delete .tmp if it exists and recreate it anew
    const tmpFolder = path.resolve(projectDir, path.join('.tmp'));
    await fs.remove(tmpFolder);
    await fs.ensureDir(tmpFolder);

    // Download the urls into a tmp dir
    const downloadDecompressPromises = options.mergeSrcUrl.map(
      async (url: string): Promise<void> => {
        // Add the absolute paths to srcDir
        const uniqFilename = `${path.basename(url, '.tar.gz')}_${crypto
          .randomBytes(16)
          .toString('hex')}`;

        const tmpFolderUncompressed = path.resolve(tmpFolder, uniqFilename);
        await fs.ensureDir(tmpFolderUncompressed);
        await downloadAndDecompressAsync(url, tmpFolderUncompressed);
        // add the decompressed folder to be merged
        mergeSrcDirs.push(tmpFolderUncompressed);
      }
    );

    await Promise.all(downloadDecompressPromises);
  }

  // add any local src dirs to be merged
  mergeSrcDirs.push(...options.mergeSrcDir);

  if (mergeSrcDirs.length > 0) {
    const srcDirs = options.mergeSrcDir.concat(options.mergeSrcUrl).join(' ');
    log(`Starting project merge of ${srcDirs} into ${options.outputDir}`);

    // Merge app distributions
    await Project.mergeAppDistributions(
      projectDir,
      [...mergeSrcDirs, options.outputDir], // merge stuff in srcDirs and outputDir together
      options.outputDir
    );
    log(`Project merge was successful. Your merged files can be found in ${options.outputDir}`);
  }
  log(`Export was successful. Your exported files can be found in ${options.outputDir}`);
}

function collect<T>(val: T, memo: T[]): T[] {
  memo.push(val);
  return memo;
}

export default function (program: Command) {
  program
    .command('export [path]')
    .description('Export the static files of the app for hosting it on a web server')
    .helpGroup('core')
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
    .option('--dev', 'Configure static files for developing locally using a non-https server')
    .option('-f, --force', 'Overwrite files in output directory without prompting for confirmation')
    .option('-s, --dump-sourcemap', 'Dump the source map for debugging the JS bundle.')
    .option('-q, --quiet', 'Suppress verbose output.')
    .option(
      '-t, --target [env]',
      'Target environment for which this export is intended. Options are `managed` or `bare`.'
    )
    .option('--merge-src-dir [dir]', 'A repeatable source dir to merge in.', collect, [])
    .option(
      '--merge-src-url [url]',
      'A repeatable source tar.gz file URL to merge in.',
      collect,
      []
    )
    .option('--max-workers [num]', 'Maximum number of tasks to allow Metro to spawn.')
    .asyncActionProjectDir(action, { checkConfig: true });
}
