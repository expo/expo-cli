import { sync as globSync } from 'glob';
import * as path from 'path';

import CommandError from '../../../CommandError';
import { resolvePortAsync } from '../utils/getFreePortAsync';
import * as XcodeBuild from './XcodeBuild';
import { resolveDeviceAsync } from './resolveDeviceAsync';

export type XcodeConfiguration = 'Debug' | 'Release';

export type Options = {
  device?: string | boolean;
  port?: number;
  scheme?: string;
  configuration?: XcodeConfiguration;
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
  projectRoot: string,
  options: Options
): Promise<XcodeBuild.BuildProps> {
  const xcodeProject = resolveXcodeProject(projectRoot);
  const device = await resolveDeviceAsync(options.device);

  const isSimulator = !('deviceType' in device);

  return {
    projectRoot,
    isSimulator,
    xcodeProject,
    device,
    configuration: options.configuration || 'Debug',
    shouldStartBundler: false,
    port: await resolvePortAsync(options.port),
    terminal: getDefaultUserTerminal(),
    scheme: options.scheme ?? path.basename(xcodeProject.name, path.extname(xcodeProject.name)),
  };
}
