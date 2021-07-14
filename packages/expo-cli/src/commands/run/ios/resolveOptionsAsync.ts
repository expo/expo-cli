import { IOSConfig } from '@expo/config-plugins';
import chalk from 'chalk';
import { sync as globSync } from 'glob';
import * as path from 'path';

import CommandError from '../../../CommandError';
import Log from '../../../log';
import { selectAsync } from '../../../prompts';
import { resolvePortAsync } from '../utils/resolvePortAsync';
import * as XcodeBuild from './XcodeBuild';
import { resolveDeviceAsync } from './resolveDeviceAsync';

export type XcodeConfiguration = 'Debug' | 'Release';

export type Options = {
  device?: string | boolean;
  clean?: boolean;
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

export async function resolveOptionsAsync(
  projectRoot: string,
  options: Options
): Promise<XcodeBuild.BuildProps> {
  const xcodeProject = resolveXcodeProject(projectRoot);
  const device = await resolveDeviceAsync(options.device);

  const isSimulator = !('deviceType' in device);

  let port = options.bundler
    ? await resolvePortAsync(projectRoot, { reuseExistingPort: true, defaultPort: options.port })
    : null;
  // Skip bundling if the port is null
  options.bundler = !!port;
  if (!port) {
    // any random number
    port = 8081;
  }

  // @ts-ignore
  if (options.scheme === true) {
    const schemes = IOSConfig.BuildScheme.getRunnableSchemesFromXcodeproj(projectRoot);
    if (!schemes.length) {
      throw new CommandError('No native iOS build schemes found');
    }
    options.scheme = schemes[0].name;
    if (schemes.length > 1) {
      options.scheme = await selectAsync(
        {
          message: 'Select a scheme',
          choices: schemes.map(value => {
            const isApp = value.type === IOSConfig.Target.TargetType.APPLICATION;
            return {
              value: value.name,
              title: isApp ? chalk.bold(value.name) + chalk.gray(' (default)') : value.name,
            };
          }),
        },
        {
          nonInteractiveHelp: `--scheme: argument must be provided with a string in non-interactive mode. Valid choices are: ${schemes.join(
            ', '
          )}`,
        }
      );
    } else {
      Log.log(`Auto selecting only available scheme: ${options.scheme}`);
    }
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
    clean: options.clean,
    device,
    configuration: options.configuration || 'Debug',
    shouldStartBundler: options.bundler ?? false,
    shouldSkipInitialBundling,
    port,
    terminal: getDefaultUserTerminal(),
    scheme: options.scheme ?? path.basename(xcodeProject.name, path.extname(xcodeProject.name)),
  };
}
