import getenv from 'getenv';
import { sync as globSync } from 'glob';
import * as path from 'path';

import CommandError from '../../../CommandError';
import Log from '../../../log';
import { choosePortAsync } from '../utils/choosePortAsync';
import * as XcodeBuild from './XcodeBuild';
import { resolveDeviceAsync } from './resolveDeviceAsync';

export type XcodeConfiguration = 'Debug' | 'Release';

export type Options = {
  device?: string | boolean;
  port?: number;
  scheme?: string;
  configuration?: XcodeConfiguration;
  bundler?: boolean;
};

export type ProjectInfo = {
  isWorkspace: boolean;
  name: string;
};

const ignoredPaths = ['**/@(Carthage|Pods|node_modules)/**'];

function findXcodeProjectPaths(
  projectRoot: string,
  extension: 'xcworkspace' | 'xcodeproj'
): string[] {
  return globSync(`ios/*.${extension}`, {
    absolute: true,
    cwd: projectRoot,
    ignore: ignoredPaths,
  });
}

function resolveXcodeProject(projectRoot: string): ProjectInfo {
  let paths = findXcodeProjectPaths(projectRoot, 'xcworkspace');
  if (paths.length) {
    return {
      // Use full path instead of relative project root so that warnings and errors contain full paths as well, this helps with filtering.
      // Also helps keep things consistent in monorepos.
      name: paths[0],
      // name: path.relative(projectRoot, paths[0]),
      isWorkspace: true,
    };
  }
  paths = findXcodeProjectPaths(projectRoot, 'xcodeproj');
  if (paths.length) {
    return { name: paths[0], isWorkspace: false };
  }
  throw new CommandError(`Xcode project not found in project: ${projectRoot}`);
}

const isMac = process.platform === 'darwin';

function getDefaultUserTerminal(): string | undefined {
  const { REACT_TERMINAL, TERM_PROGRAM, TERM } = process.env;

  if (REACT_TERMINAL) {
    return REACT_TERMINAL;
  }

  if (isMac) {
    return TERM_PROGRAM;
  }

  return TERM;
}

export async function resolvePortAsync(
  projectRoot: string,
  defaultPort?: number
): Promise<number | null> {
  const port = defaultPort ?? getenv.int('RCT_METRO_PORT', 8081);

  // Only check the port when the bundler is running.
  const resolvedPort = await choosePortAsync(projectRoot, port);
  if (resolvedPort == null) {
    Log.log('\u203A Skipping dev server');
    // Skip bundling if the port is null
  } else {
    // Use the new or resolved port
    process.env.RCT_METRO_PORT = String(resolvedPort);
  }

  return resolvedPort;
}

export async function resolveOptionsAsync(
  projectRoot: string,
  options: Options
): Promise<XcodeBuild.BuildProps> {
  const xcodeProject = resolveXcodeProject(projectRoot);
  const device = await resolveDeviceAsync(options.device);

  const isSimulator = !('deviceType' in device);

  let port = await resolvePortAsync(projectRoot, options.port);
  // Skip bundling if the port is null
  options.bundler = !!port;
  if (!port) {
    // any random number
    port = 8081;
  }

  const configuration = options.configuration || 'Debug';
  // This optimization skips resetting the Metro cache needlessly.
  // The cache is reset in `../node_modules/react-native/scripts/react-native-xcode.sh` when the
  // project is running in Debug and built onto a physical device. It seems that this is done because
  // the script is run from Xcode and unaware of the CLI instance.
  const shouldSkipInitialBundling = configuration === 'Debug' && !isSimulator;
  return {
    projectRoot,
    isSimulator,
    xcodeProject,
    device,
    configuration: options.configuration || 'Debug',
    shouldStartBundler: options.bundler ?? false,
    shouldSkipInitialBundling,
    port,
    terminal: getDefaultUserTerminal(),
    scheme: options.scheme ?? path.basename(xcodeProject.name, path.extname(xcodeProject.name)),
  };
}
