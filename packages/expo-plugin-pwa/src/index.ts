#!/usr/bin/env node
import chalk from 'chalk';
import { Command } from 'commander';
import fs from 'fs-extra';
import { relative, resolve } from 'path';

import { generateManifestAsync } from './generate-manifest';
import {
  generateAndroidAppIconsAsync,
  generateIosAppIconsAsync,
  generateWindowsAppIconsAsync,
} from './generateAppIconsAsync';
import { generateFaviconsAsync } from './generateFaviconsAsync';
import { generateSplashScreensAsync } from './generateSplashScreensAsync';
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
  .option('--platform <platform>', 'Platform to generate for: ios, android, ms')
  .option('--resize <mode>', 'Resize mode to use', 'contain')
  .option('--color <color>', 'Background color for images (must be opaque)')
  .action((src: string, options) => {
    if (!src) throw new Error('pass image path with --src <path.png>');
    icon({
      src,
      output: options.output,
      publicPath: options.public || options.output,
      platform: options.platform,
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
  .action((src: string, options) => {
    if (!src) throw new Error('pass image path with --src <path.png>');
    favicon({ src, output: options.output, publicPath: options.public || options.output })
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
    splash({
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
    manifest({
      src: config,
      output: options.output,
      publicPath: options.public || options.output,
    })
      .then(shouldUpdate)
      .catch(commandDidThrowAsync);
  });

program.parse(process.argv);

async function splash({
  src,
  output,
  publicPath,
  color,
  resizeMode,
}: {
  src: string;
  output: string;
  publicPath: string;
  color: string;
  resizeMode: string;
}) {
  const sourcePath = resolve(src);
  const outputPath = resolve(output);
  const _publicPath = resolve(publicPath);
  fs.removeSync(outputPath);
  fs.ensureDirSync(outputPath);

  const meta: string[] = await generateSplashScreensAsync(
    sourcePath,
    outputPath,
    relative(_publicPath, outputPath),
    color,
    resizeMode
  );
  logMeta(meta);
}
async function manifest({
  src,
  output,
  publicPath,
}: {
  src: string;
  output: string;
  publicPath: string;
}) {
  const sourcePath = resolve(src);
  const outputPath = resolve(output);
  const _publicPath = resolve(publicPath);
  fs.removeSync(outputPath);
  fs.ensureDirSync(outputPath);

  let meta: string[] = await generateManifestAsync({
    src: sourcePath,
    dest: outputPath,
    publicPath: relative(_publicPath, outputPath),
  });
  logMeta(meta);
}
async function favicon({
  src,
  output,
  publicPath,
}: {
  src: string;
  output: string;
  publicPath: string;
}) {
  const sourcePath = resolve(src);
  const outputPath = resolve(output);
  const _publicPath = resolve(publicPath);
  fs.removeSync(outputPath);
  fs.ensureDirSync(outputPath);

  const meta: string[] = await generateFaviconsAsync(
    sourcePath,
    outputPath,
    relative(_publicPath, outputPath)
  );
  logMeta(meta);
}
async function icon({
  src,
  output,
  publicPath,
  platform,
  color,
  resizeMode,
}: {
  src: string;
  output: string;
  publicPath: string;
  platform: string;
  color: string;
  resizeMode: string;
}) {
  const sourcePath = resolve(src);
  const outputPath = resolve(output);
  const _publicPath = resolve(publicPath);
  fs.removeSync(outputPath);
  fs.ensureDirSync(outputPath);

  // @ts-ignore
  const genAsync = {
    android: generateAndroidAppIconsAsync,
    ios: generateIosAppIconsAsync,
    ms: generateWindowsAppIconsAsync,
  }[platform] as any;

  const { meta, manifest } = await genAsync(
    sourcePath,
    outputPath,
    relative(_publicPath, outputPath),
    color,
    resizeMode
  );
  logMeta(meta);
  logManifest(manifest);
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
