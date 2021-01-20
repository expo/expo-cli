import getenv from 'getenv';
import { sync as globSync } from 'glob';
import * as path from 'path';

import CommandError from '../../CommandError';
import log from '../../log';
import * as XcodeBuild from './XcodeBuild';
import { resolveDeviceAsync } from './resolveDeviceAsync';

export type XcodeConfiguration = 'Debug' | 'Release';

export type Options = {
  device?: string | boolean;
  port?: number;
  bundler?: boolean;
  scheme?: string;
  configuration?: XcodeConfiguration;
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

export type ProjectInfo = {
  isWorkspace: boolean;
  name: string;
};

function resolveXcodeProject(projectRoot: string): ProjectInfo {
  let paths = findXcodeProjectPaths(projectRoot, 'xcworkspace');
  if (paths.length) {
    return { name: paths[0], isWorkspace: true };
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

export async function resolveOptionsAsync(
  projectDir: string,
  options: Options
): Promise<XcodeBuild.BuildProps> {
  const xcodeProject = resolveXcodeProject(projectDir);
  const device = await resolveDeviceAsync(options.device);

  const isSimulator = !('deviceType' in device);

  return {
    isSimulator,
    xcodeProject,
    device,
    configuration: options.configuration || 'Debug',
    verbose: log.isDebug,
    shouldStartBundler: !!options.bundler,
    port: options.port ?? getenv.int('RCT_METRO_PORT', 8081),
    terminal: getDefaultUserTerminal(),
    scheme: options.scheme ?? path.basename(xcodeProject.name, path.extname(xcodeProject.name)),
  };
}
