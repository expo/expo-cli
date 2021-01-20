import getenv from 'getenv';
import * as path from 'path';

import log from '../../log';
import * as XcodeBuild from './XcodeBuild';
import { resolveDeviceAsync } from './resolveDeviceAsync';

export type Options = {
  device?: string | boolean;
  port?: number;
  bundler?: boolean;
  scheme?: string;
  configuration?: XcodeBuild.XcodeConfiguration;
};

const isMac = process.platform === 'darwin';

const getDefaultUserTerminal = (): string | undefined => {
  const { REACT_TERMINAL, TERM_PROGRAM, TERM } = process.env;

  if (REACT_TERMINAL) {
    return REACT_TERMINAL;
  }

  if (isMac) {
    return TERM_PROGRAM;
  }

  return TERM;
};

export async function resolveOptionsAsync(
  projectDir: string,
  options: Options
): Promise<XcodeBuild.BuildProps> {
  const xcodeProject = XcodeBuild.findProject(projectDir);
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
