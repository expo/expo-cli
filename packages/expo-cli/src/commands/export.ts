import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs-extra';
import validator from 'validator';
import path from 'path';
import targz from 'targz';
import { Project, ProjectSettings, UrlUtils } from '@expo/xdl';
import { ProjectTarget, getDefaultTargetAsync } from '@expo/config';
import { Command } from 'commander';

import log from '../log';
import { installExitHooks } from '../exit';
import CommandError from '../CommandError';

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
};

export async function action(projectDir: string, options: Options) {
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

  const target = options.target ?? (await getDefaultTargetAsync(projectDir));

  const status = await Project.currentStatus(projectDir);
  let shouldStartOurOwn = false;

  if (status === 'running') {
    const packagerInfo = await ProjectSettings.readPackagerInfoAsync(projectDir);
    const runningPackagerTarget = packagerInfo.target ?? 'managed';
    if (target !== runningPackagerTarget) {
      log(
        'Found an existing Expo CLI instance running for this project but the target did not match.'
      );
      await Project.stopAsync(projectDir);
      log('Starting a new Expo CLI instance...');
      shouldStartOurOwn = true;
    }
  } else {
    log('Unable to find an existing Expo CLI instance for this directory; starting a new one...');
    shouldStartOurOwn = true;
  }

  let startedOurOwn = false;
  if (shouldStartOurOwn) {
    installExitHooks(projectDir);

    const startOpts: Project.StartOptions = {
      reset: !!options.clear,
      nonPersistent: true,
      target,
    };
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

  // Merge src dirs/urls into a multimanifest if specified
  const mergeSrcDirs = [];

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
        const tmpFileCompressed = path.resolve(tmpFolder, uniqFilename + '_compressed');
        const tmpFolderUncompressed = path.resolve(tmpFolder, uniqFilename);
        await download(url, tmpFileCompressed);
        await decompress(tmpFileCompressed, tmpFolderUncompressed);

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

const download = async (uri: string, filename: string): Promise<null> => {
  const response = await axios({
    method: 'get',
    url: uri,
    responseType: 'stream',
  });

  response.data.pipe(fs.createWriteStream(filename));

  return new Promise((resolve, reject) => {
    response.data.on('close', () => resolve(null));
    response.data.on('error', (err?: Error) => {
      reject(err);
    });
  });
};

const decompress = async (src: string, dest: string): Promise<null> => {
  return new Promise((resolve, reject) => {
    targz.decompress(
      {
        src,
        dest,
      },
      (error: string | Error | null) => {
        if (error) {
          reject(error);
        } else {
          resolve(null);
        }
      }
    );
  });
};

function collect<T>(val: T, memo: Array<T>): Array<T> {
  memo.push(val);
  return memo;
}

export default function(program: Command) {
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
    .option('-s, --dump-sourcemap', 'Dump the source map for debugging the JS bundle.')
    .option('-q, --quiet', 'Suppress verbose output from the React Native packager.')
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
    .asyncActionProjectDir(action, false, true);
}
