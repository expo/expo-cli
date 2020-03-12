#!/usr/bin/env node
import chalk from 'chalk';
import { Command } from 'commander';
import fs from 'fs-extra';
import { dirname, relative, resolve } from 'path';

import { HTMLOutput, generateAsync } from '.';
import { htmlTagObjectToString } from './HTML';
import shouldUpdate from './update';

async function commandDidThrowAsync(reason: any) {
  console.log();
  console.log('Aborting run');
  if (reason.command) {
    console.log(`  ${chalk.magenta(reason.command)} has failed.`);
  } else {
    console.log(chalk.red`An unexpected error was encountered. Please report it as a bug:`);
    console.log(reason);
  }
  console.log();

  await shouldUpdate();

  process.exit(1);
}

const packageJson = () => require('../package.json');

const program = new Command(packageJson().name).version(packageJson().version);

program
  .command('icon <src>')
  .description('Generate the homescreen icons for a PWA')
  .option('-o, --output <folder>', 'Output directory', 'public')
  .option('-p, --public <folder>', 'Public folder. Default: <output>')
  .option('--platform <platform>', 'Platform to generate for: safari, chrome')
  .option('--resize <mode>', 'Resize mode to use', 'contain')
  .option('--color <color>', 'Background color for images (must be opaque)')
  .action((src: string, options) => {
    if (!src) throw new Error('pass image path with --src <path.png>');
    genImage(options.platform + '-icon', {
      src,
      output: options.output,
      publicPath: options.public || options.output,
      resizeMode: options.resize,
      color: options.color,
    })
      .then(shouldUpdate)
      .catch(commandDidThrowAsync);
  });

program
  .command('favicon <src>')
  .description('Generate the favicons for a website')
  .option('-o, --output <folder>', 'Output directory', 'public')
  .option('-p, --public <folder>', 'Public folder. Default: <output>')
  .option('--resize <mode>', 'Resize mode to use', 'contain')
  .option('--color <color>', 'Background color of the image', 'transparent')
  .action((src: string, options) => {
    if (!src) throw new Error('pass image path with --src <path.png>');
    genImage('favicon', {
      src,
      output: options.output,
      publicPath: options.public || options.output,
      resizeMode: options.resize,
      color: options.color,
    })
      .then(shouldUpdate)
      .catch(commandDidThrowAsync);
  });

program
  .command('splash <src>')
  .description('Generate the iOS splash screens for a PWA')
  .option('-o, --output <folder>', 'Output directory', 'public')
  .option('-p, --public <folder>', 'Public folder. Default: <output>')
  .option('--resize <mode>', 'Resize mode to use', 'contain')
  .option('--color <color>', 'Background color of the image', 'white')
  .action((src: string, options) => {
    if (!src) throw new Error('pass image path with --src <path.png>');
    genImage('splash', {
      src,
      output: options.output,
      publicPath: options.public || options.output,
      resizeMode: options.resize,
      color: options.color,
    })
      .then(shouldUpdate)
      .catch(commandDidThrowAsync);
  });

program
  .command('manifest <config>')
  .description('Generate the PWA manifest from an Expo project config')
  .option('-o, --output <folder>', 'Output directory', 'public')
  .option('-p, --public <folder>', 'Public folder. Default: <output>')
  .action((config: string, options) => {
    if (!config) throw new Error('pass an expo config path with --config <path>');
    genImage('manifest', {
      src: '',
      output: options.output,
      publicPath: options.public || options.output,
      resizeMode: options.resize,
      color: options.color,
    })
      .then(shouldUpdate)
      .catch(commandDidThrowAsync);
  });

program.parse(process.argv);

async function genImage(
  type: string,
  {
    src,
    output,
    publicPath,
    color: backgroundColor,
    resizeMode,
  }: {
    src: string;
    output: string;
    publicPath: string;
    color: string;
    resizeMode: string;
  }
) {
  const items = await generateAsync(
    type,
    { projectRoot: resolve(process.cwd()), publicPath: resolve(publicPath) },
    { src: resolve(src), backgroundColor, resizeMode: resizeMode as any }
  );

  const outputPath = resolve(output);
  await resolveOutputAsync(publicPath, outputPath, items);
}

async function resolveOutputAsync(publicPath: string, outputPath: string, items: HTMLOutput[]) {
  fs.ensureDirSync(outputPath);

  let meta: string[] = [];
  let manifest: Record<string, any> = {};

  for (const item of items) {
    if (item.tag) {
      if (item.tag?.attributes?.href) {
        item.tag.attributes.href = relative(publicPath, item.tag?.attributes?.href);
      }
      // Write HTML
      meta.push(htmlTagObjectToString(item.tag));
    }
    if (item.manifest) {
      // Write Manifest
      if (!Array.isArray(manifest.icons)) manifest.icons = [];
      manifest.icons.push(item.manifest);
    }

    // Write image
    const assetPath = resolve(outputPath, item.asset.path);
    fs.ensureDirSync(dirname(assetPath));
    console.log(`writing file: ${assetPath}`);
    await fs.writeFile(assetPath, item.asset.source);
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
