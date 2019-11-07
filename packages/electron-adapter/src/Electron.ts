import JsonFile from '@expo/json-file';
// @ts-ignore
import { getModuleFileExtensions } from '@expo/webpack-config/utils';
import { getPluginsByName } from '@expo/webpack-config/webpack/utils/loaders';
import chalk from 'chalk';
import { spawn } from 'child_process';
import { build, createTargets, Platform } from 'electron-builder';
import fs from 'fs-extra';
import { boolish } from 'getenv';
import { Lazy } from 'lazy-val';
import * as path from 'path';
import resolveFrom from 'resolve-from';
import { Configuration } from 'webpack';

import { getConfiguration } from './config';
import { getCommonEnv, logProcess, logProcessErrorOutput } from './dev-utils';

const debug = require('debug')('electron-adapter');

export type Environment = { projectRoot: string; [key: string]: any };

export type Arguments = { [key: string]: any };

export type WebpackConfigFactory = (
  env: Environment,
  argv: Arguments
) => Configuration | Promise<Configuration>;

function ensureExpoWebpackConfigInstalled(projectRoot: string) {
  const projectHasWebpackConfig = !!resolveFrom.silent(projectRoot, '@expo/webpack-config');
  if (!projectHasWebpackConfig) {
    throw new Error(
      `\`@expo/electron-adapter\` requires the package \`@expo/webpack-config\` to be installed in your project. To continue, run the following then try again: \`yarn add --dev @expo/webpack-config\``
    );
  }
}

export async function withElectronAsync(
  env: Environment,
  argv: Arguments,
  createWebpackConfigAsync?: WebpackConfigFactory
): Promise<Configuration> {
  if (typeof createWebpackConfigAsync !== 'function') {
    // No custom config factory was passed, attempt to invoke method again with @expo/webpack-config.
    ensureExpoWebpackConfigInstalled(env.projectRoot);
    const createExpoWebpackConfigAsync = require('@expo/webpack-config');
    return await withElectronAsync(env, argv, createExpoWebpackConfigAsync);
  }

  const shouldStartElectron = boolish('EXPO_ELECTRON_ENABLED', false);

  if (shouldStartElectron) {
    configureEnvironment(env.projectRoot);
  }

  const config = await createWebpackConfigAsync(env, argv);

  if (!config) {
    throw new Error(
      `The config returned from \`createWebpackConfigAsync(env, argv)\` was null. Expected a valid \`Webpack.Configuration\``
    );
  }

  return shouldStartElectron ? injectElectronAdapterSupport(config) : config;
}

export function configureEnvironment(projectRoot: string, outputFolder: string = 'electron-build') {
  process.env.WEBPACK_BUILD_OUTPUT_PATH = path.join(projectRoot, outputFolder, 'web');
  process.env.WEB_PUBLIC_URL = './';
}

/**
 * Configure @expo/webpack-config to work with Electron
 */
export function injectElectronAdapterSupport(config: Configuration): Configuration {
  config.target = 'electron-renderer';

  const isProduction = config.mode === 'production';

  if (isProduction) {
    config.devtool = 'nosources-source-map';
  }

  // It's important that we overwrite the existing node mocks
  config.node = {
    __filename: !isProduction,
    __dirname: !isProduction,
  };

  if (!config.output) config.output = {};

  // Remove compression plugins
  for (const pluginName of ['CompressionPlugin', 'BrotliPlugin']) {
    const [plugin] = getPluginsByName(config, pluginName);
    if (plugin) {
      config.plugins!.splice(plugin.index, 1);
    }
  }

  config.output = {
    ...config.output,
    filename: '[name].js',
    chunkFilename: '[name].bundle.js',
    libraryTarget: 'commonjs2',
  };

  if (!config.resolve) {
    config.resolve = {};
  }

  // Make electron projects resolve files with a .electron extension first
  config.resolve.extensions = getModuleFileExtensions('electron', 'web');

  return config;
}

export function startAsync(
  projectRoot: string,
  { port, url, ...env }: { [key: string]: any }
): Promise<any> {
  let electronArgs = process.env.ELECTRON_ARGS;
  const args: string[] =
    electronArgs != null && electronArgs.length > 0
      ? JSON.parse(electronArgs)
      : [`--inspect=${port}`];

  const innerEnv = {
    ...getCommonEnv(),
    ...env,
    EXPO_ELECTRON_URL: url,
    // Hide the warnings in chrome dev tools during development
    ELECTRON_DISABLE_SECURITY_WARNINGS: '1',
  };

  const mainFile = require.resolve('./electron-process/index');
  const relativeFilePath = path.relative(projectRoot, mainFile);
  args.push(relativeFilePath);
  args.push(...process.argv.slice(3));

  return startElectronAsync(args, innerEnv);
}

function startElectronAsync(electronArgs: Array<string>, env: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let hasReturned: boolean = false;

    const _resolve = () => {
      if (hasReturned) return;
      hasReturned = true;
      resolve();
    };

    const electronProcess = spawn(require('electron').toString(), electronArgs, {
      env,
    });

    // required on windows
    require('async-exit-hook')(() => {
      _resolve();
      electronProcess.kill('SIGINT');
    });

    let queuedData: string | null = null;
    electronProcess.stdout.on('data', data => {
      data = data.toString();
      if (data.trim() === '[HMR] Updated modules:') {
        queuedData = data;
        return;
      }

      if (queuedData != null) {
        data = queuedData + data;
        queuedData = null;
      }

      logProcess('Electron', data, chalk.blue);
    });

    logProcessErrorOutput('Electron', electronProcess, _resolve);

    electronProcess.on('close', exitCode => {
      debug(`Electron exited with exit code ${exitCode}`);
      if (exitCode === 100) {
        setImmediate(() => {
          startElectronAsync(electronArgs, env)
        });
      } else {
        (process as any).emit('message', 'shutdown');
      }
    });
  });
}

async function transformPackageJsonAsync(projectRoot: string, outputPath: string): Promise<void> {
  const targetPackageJson = path.resolve(outputPath, 'package.json');

  // Rewrite package.json with new main entry
  const packageJson = await JsonFile.readAsync(path.resolve(projectRoot, 'package.json'));
  packageJson.main = './index.js';

  if (!packageJson.devDependencies) packageJson.devDependencies = {};

  // @ts-ignore
  for (const dependency of Object.keys(packageJson.devDependencies)) {
    // @ts-ignore
    if (!dependency.match(/electron/)) delete packageJson.devDependencies[dependency];
  }

  // @ts-ignore
  if (!('electron' in packageJson.devDependencies)) {
    // @ts-ignore
    packageJson.devDependencies.electron = '6.0.12';
  }

  await JsonFile.writeAsync(targetPackageJson, packageJson, {
    json5: false,
  });
}

async function copyElectronFilesToBuildFolder(
  projectRoot: string,
  outputPath: string
): Promise<void> {
  const overwriteTemplate = path.join(projectRoot, 'electron-process');
  const defaultTemplate = path.resolve(__dirname, 'electron-process');
  let shouldOverwrite = false;
  try {
    require.resolve(overwriteTemplate);
    shouldOverwrite = true;
  } catch (_) {
    shouldOverwrite = false;
  }

  const targetPath = shouldOverwrite ? overwriteTemplate : defaultTemplate;

  await fs.copy(targetPath, outputPath, {
    overwrite: true,
    recursive: true,
  });
}
export async function buildAsync(
  projectRoot: string,
  options: { outputPath: string }
): Promise<void> {
  const outputPath = path.resolve(options.outputPath, '../');

  await fs.ensureDir(outputPath);
  await copyElectronFilesToBuildFolder(projectRoot, outputPath);
  await transformPackageJsonAsync(projectRoot, outputPath);

  const config =
    (await getConfiguration({
      projectRoot,
      packageMetadata: new Lazy(async () => ({})),
    })) || {};

  const finalConfig = {
    targets: createTargets([
      // Platform.MAC,
      // builder.Platform.WINDOWS,
      Platform.LINUX,
    ]),
    projectDir: outputPath,
    ...config,
    config: {
      directories: {
        output: outputPath,
        app: outputPath,
      },
      // @ts-ignore
      ...(config.config || {}),

      // build options, see https://goo.gl/QQXmcV
    },
  };

  if (process.env.EXPO_ELECTRON_DEBUG_REBUILD) {
    console.log('Building Electron in debug mode...');
    finalConfig.config = {
      ...finalConfig.config,
      compression: 'store',
      // asar: false,
      npmRebuild: false,
      mac: {
        identity: null,
      },
    };
  }

  await build(finalConfig);
}
