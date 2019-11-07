import JsonFile from '@expo/json-file';
import chalk from 'chalk';
import { spawn } from 'child_process';
import { build, createTargets, PackagerOptions, Platform } from 'electron-builder';
import fs from 'fs-extra';
import * as path from 'path';
import { getConfig } from 'read-config-file';

import { getMainProcessEnvironment, logProcess, logProcessErrorOutput } from './Logger';

export * from './Webpack';

const debug = require('debug')('electron-adapter');

export async function getConfiguration(projectRoot: string): Promise<PackagerOptions | null> {
  const result = await getConfig<PackagerOptions>({
    packageKey: 'expoElectron',
    configFilename: 'expo-electron.config',
    projectDir: projectRoot,
    packageMetadata: null,
  });

  if (result) {
    return result.result;
  }

  return null;
}

export async function buildAsync(
  projectRoot: string,
  options: { outputPath: string }
): Promise<void> {
  const outputPath = path.resolve(options.outputPath, '../');

  await fs.ensureDir(outputPath);
  await copyElectronFilesToBuildFolder(projectRoot, outputPath);
  await transformPackageJsonAsync(projectRoot, outputPath);

  const config = getConfiguration(projectRoot);

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
    console.log();
    console.log(chalk.magenta(`\u203A Building Expo Electron in ${chalk.bold`debug`} mode...`));

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
    ...getMainProcessEnvironment(),
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
  return new Promise((resolve) => {
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
