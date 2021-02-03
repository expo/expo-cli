#!/usr/bin/env node
import { ResizeMode } from '@expo/image-utils';
import chalk from 'chalk';
import { Command } from 'commander';
import fs from 'fs';
import { dirname, join, relative, resolve } from 'path';

import { generateAsync, generateManifestAsync } from '.';
import { htmlTagObjectToString } from './HTML';
import { HTMLOutput } from './Manifest.types';
import shouldUpdate from './update';

const packageJson = () => require('../package.json');

const program = new Command(packageJson().name).version(packageJson().version);

const validateSourceArgument = (src: string, command: string) => {
  if (!src) {
    console.error(chalk.black.bgRed(`You must supply a valid image path or remote URL. Example:`));
    console.error(`\n   $ expo-pwa ${command} -i ./assets/icon.png`);
    console.error();
    process.exit(-1);
  }
};

type ManifestCommandOptions = {
  output: string;
  input?: string;
  public?: string;
};

type AssetCommandOptions = {
  output: string;
  input: string;
  public?: string;
  resize?: string;
  color?: string;
};

type IconAssetCommandOptions = AssetCommandOptions & {
  platform: 'safari' | 'chrome';
};

function outputCommand(name: string, examples: string[] = []): Command {
  return program
    .command(`${name} [project-root]`)
    .option('-i, --input <file>', 'Input file to process')
    .option('-o, --output <path>', 'Output directory. Default: <project-root/>web')
    .option('-p, --public <path>', 'Public folder. Default: <output>')
    .on('--help', () => {
      if (!examples.length) return;

      console.log();
      console.log('Examples:');
      console.log();
      for (const example of examples) {
        console.log(`  $ expo-pwa ${name} ${example}`);
      }
      console.log();
    });
}

function assetCommand(name: string, examples: string[] = []): Command {
  return outputCommand(name, examples)
    .option('-r, --resize', 'Resize mode to use [contain, cover]', 'contain')
    .option('-c, --color', 'CSS background color for to use for the images (should be opaque).');
}

assetCommand('icon', ['--platform safari -i ./icon.png', '--platform chrome -i ./icon.png'])
  .description('Generate the home screen icons for a PWA')
  .option('--platform [string]', 'Platform to generate for: safari, chrome')
  .action(async (inputProjectRoot: string, options: IconAssetCommandOptions) => {
    validateSourceArgument(options.input, 'favicon');
    const projectRoot = inputProjectRoot ?? process.cwd();
    const output = options.output ?? join(projectRoot, 'web');

    try {
      await generateAssets(projectRoot, options.platform + '-icon', {
        src: options.input,
        output,
        publicPath: options.public || output,
        resizeMode: options.resize,
        color: options.color || 'transparent',
      });
      await shouldUpdate();
    } catch (error) {
      await commandDidThrowAsync(error);
    }
  });

assetCommand('favicon', ['-i ./icon.png'])
  .description('Generate the favicons for a website')
  .action(async (inputProjectRoot: string, options: AssetCommandOptions) => {
    validateSourceArgument(options.input, 'favicon');
    const projectRoot = inputProjectRoot ?? process.cwd();
    const output = options.output ?? join(projectRoot, 'web');

    try {
      await generateAssets(projectRoot, 'favicon', {
        src: options.input,
        output,
        publicPath: options.public || output,
        resizeMode: options.resize,
        color: options.color || 'transparent',
      });
      await shouldUpdate();
    } catch (error) {
      await commandDidThrowAsync(error);
    }
  });

assetCommand('splash', ['--color blue --resize cover -i ./splash.png'])
  .description('Generate the Safari splash screens for a PWA')
  .action(async (inputProjectRoot: string, options: AssetCommandOptions) => {
    validateSourceArgument(options.input, 'favicon');
    const projectRoot = inputProjectRoot ?? process.cwd();
    const output = options.output ?? join(projectRoot, 'web');

    try {
      await generateAssets(projectRoot, 'splash', {
        src: options.input,
        output,
        publicPath: options.public || output,
        resizeMode: options.resize,
        color: options.color || 'white',
      });
      await shouldUpdate();
    } catch (error) {
      await commandDidThrowAsync(error);
    }
  });

outputCommand('manifest', ['-i ./random.config.js'])
  .description('Generate the PWA manifest from an Expo project config')
  .action(async (inputProjectRoot: string, options: ManifestCommandOptions) => {
    const projectRoot = resolve(inputProjectRoot ?? process.cwd());
    const output = options.output ?? join(projectRoot, 'web');
    const publicPath = resolve(options.public ?? output);
    const outputPath = resolve(output);

    try {
      const items = await generateManifestAsync(
        {
          projectRoot: resolve(projectRoot),
          publicPath,
        },
        options.input ? resolve(options.input) : undefined
      );
      await resolveOutputAsync(publicPath, outputPath, items);
      await shouldUpdate();
    } catch (error) {
      await commandDidThrowAsync(error);
    }
  });

program.parse(process.argv);

type AssetOptions = {
  src: string;
  output: string;
  publicPath: string;
  color: string;
  resizeMode?: string;
};

async function generateAssets(
  projectRoot: string | undefined,
  type: string,
  { src, output, publicPath, color: backgroundColor, resizeMode = 'contain' }: AssetOptions
) {
  if (!isResizeMode(resizeMode)) {
    console.error(
      chalk.black.bgRed(
        `The provided resizeMode "${resizeMode}" is invalid. Please use one of [cover, contain]`
      )
    );
    process.exit(-1);
  }
  const items = await generateAsync(
    type,
    { projectRoot: resolve(projectRoot || process.cwd()), publicPath: resolve(publicPath) },
    { src, backgroundColor, resizeMode }
  );

  const outputPath = resolve(output);
  await resolveOutputAsync(publicPath, outputPath, items);
}

async function resolveOutputAsync(publicPath: string, outputPath: string, items: HTMLOutput[]) {
  fs.mkdirSync(outputPath, { recursive: true });

  const meta: string[] = [];
  const manifest: Record<string, any> = {};

  for (const item of items) {
    if (item.tag) {
      if (item.tag?.attributes?.href) {
        item.tag.attributes.href = '/' + relative(publicPath, item.tag?.attributes?.href);
      }
      // Write HTML
      meta.push(htmlTagObjectToString(item.tag));
    }
    if (item.manifest) {
      // Write Manifest
      if (!Array.isArray(manifest.icons)) manifest.icons = [];
      if (item.manifest?.src) {
        item.manifest.src = '/' + relative(publicPath, item.manifest.src);
      }
      manifest.icons.push(item.manifest);
    }

    // Write image
    const assetPath = resolve(outputPath, item.asset.path);
    fs.mkdirSync(dirname(assetPath), { recursive: true });
    fs.writeFileSync(assetPath, item.asset.source);
  }

  if (meta.length) {
    logMeta(meta);
  }

  if (Object.keys(manifest).length) {
    logManifest(manifest);
  }
}

function logManifest(manifest: Record<string, any>) {
  if (!Object.keys(manifest).length) return;
  console.log();
  console.log(
    chalk.magenta(
      '\u203A Copy the following lines into your PWA `manifest.json` to link the new assets.'
    )
  );
  console.log();
  console.log(JSON.stringify(manifest, null, 2));
  console.log();
}

function logMeta(meta: string[]) {
  if (!meta.length) return;
  console.log();
  console.log(
    chalk.magenta('\u203A Copy the following lines into your HTML <head/> to link the new assets.')
  );
  console.log();
  for (const metaLine of meta) {
    console.log(metaLine);
  }
  console.log();
}

function isResizeMode(input: any): input is ResizeMode {
  return input && ['contain', 'cover', 'fill', 'inside', 'outside'].includes(input);
}

async function commandDidThrowAsync(reason: any) {
  console.log();
  console.log('Aborting run');
  if (reason.command) {
    console.log(`  ${chalk.magenta(reason.command)} has failed.`);
  } else {
    console.log(chalk.black.bgRed`An unexpected error was encountered. Please report it as a bug:`);
    console.log(reason);
  }
  console.log();

  await shouldUpdate();

  process.exit(1);
}
