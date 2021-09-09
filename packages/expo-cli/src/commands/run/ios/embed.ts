import spawnAsync from '@expo/spawn-async';
import fs from 'fs-extra';
import path from 'path';
import resolveFrom from 'resolve-from';
import { Webpack } from 'xdl';

import { AbortCommandError } from '../../../CommandError';
import Log from '../../../log';

/**
 * A JS implementation of `react-native/scripts/react-native-xcode.sh` which can be run before the native build for quicker results.
 *
 * @param projectRoot
 * @param param1
 * @returns
 */
export async function bundleAppAsync(
  projectRoot: string,
  {
    destination,
    bundleCommand = 'bundle',
    cliPath,
    bundleConfig,
    entryFile,
    dev,
    resetCache,
    extraPackagerArgs = [],
  }: {
    destination: string;
    entryFile: string;
    dev: boolean;
    bundleCommand?: string;
    cliPath?: string;
    bundleConfig?: string;
    extraPackagerArgs?: string[];
    resetCache?: boolean;
  }
) {
  if (!cliPath) {
    cliPath = resolveRNCLI(projectRoot);
  }
  let configArg: string[] = [];
  if (bundleConfig) {
    configArg = ['--config', bundleConfig];
  }

  if (process.env.BUNDLE_COMMAND) {
    Log.warn('Env BUNDLE_COMMAND is not supported in bundle-first mode');
  }
  if (process.env.CLI_PATH) {
    Log.warn('Env CLI_PATH is not supported in bundle-first mode');
  }
  if (process.env.NODE_ARGS) {
    Log.warn('Env NODE_ARGS is not supported in bundle-first mode');
  }

  const bundleFile = path.join(destination, 'main.jsbundle');
  const args = [
    cliPath,
    bundleCommand,
    ...configArg,
    '--entry-file',
    entryFile,
    '--platform',
    'ios',
    '--dev',
    String(!!dev),
    '--bundle-output',
    bundleFile,
    '--assets-dest',
    destination,
  ];
  if (resetCache !== false) {
    args.push('--reset-cache');
  }

  args.push(...(extraPackagerArgs || []));

  Log.debug('Run: node ' + args.join(' '));

  // TODO: Replace with a JS implementation for speed and control.
  try {
    // Hack required to make content output to the correct folder.
    process.env.WEBPACK_BUILD_OUTPUT_PATH = destination;
    await Webpack.bundleAsync(projectRoot, {
      dev: !!dev,
      platform: 'ios',
      webpackEnv: {
        platform: 'ios',
        entryFile,
        // @ts-ignore
        bundleOutput: bundleFile,
        // @ts-ignore
        assetsDest: destination,
      },
      clear: resetCache,
    });

    // await spawnAsync('node', args, {
    //   cwd: projectRoot,
    //   stdio: 'inherit',
    //   env: {
    //     ...process.env,
    //     NODE_OPTIONS: process.env.METRO_NODE_OPTIONS,
    //     REACT_NATIVE_APP_ROOT: projectRoot,
    //     RCT_NO_LAUNCH_PACKAGER: '1',
    //     ELECTRON_RUN_AS_NODE: '1',
    //   },
    // });
  } catch (error) {
    // ctrl+c
    if (error.signal === 'SIGINT') {
      throw new AbortCommandError();
    }
    throw error;
  }

  return destination;
}

function resolveRNCLI(projectRoot: string) {
  // Get the CLI path
  return resolveFrom(projectRoot, 'react-native/local-cli/cli.js');
}

async function copyDirAsync(src: string, dest: string) {
  await fs.promises.mkdir(dest, { recursive: true });
  const entries = await fs.promises.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirAsync(srcPath, destPath);
    } else {
      await fs.promises.copyFile(srcPath, destPath);
    }
  }
}

export async function embedBundleAsync(bundlePath: string, binaryPath: string) {
  Log.debug('Copying JS into app binary folder: ' + binaryPath);
  // Move pre bundled app into binary
  await copyDirAsync(bundlePath, binaryPath);
  if (!Log.isDebug) {
    // clean up
    await fs.remove(bundlePath);
  }
}
