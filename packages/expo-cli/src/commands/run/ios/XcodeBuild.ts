import spawnAsync from '@expo/spawn-async';
import { ExpoRunFormatter } from '@expo/xcpretty';
import chalk from 'chalk';
import { spawn, SpawnOptionsWithoutStdio } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import { SimControl } from 'xdl';

import CommandError, { AbortCommandError } from '../../../CommandError';
import Log from '../../../log';
import { ensureDeviceIsCodeSignedForDeploymentAsync } from './developmentCodeSigning';
import { ProjectInfo, XcodeConfiguration } from './resolveOptionsAsync';

export type BuildProps = {
  projectRoot: string;
  isSimulator: boolean;
  xcodeProject: ProjectInfo;
  device: Pick<SimControl.XCTraceDevice, 'name' | 'udid'>;
  configuration: XcodeConfiguration;
  shouldSkipInitialBundling: boolean;
  shouldStartBundler: boolean;
  terminal?: string;
  port: number;
  scheme: string;
};

type XcodeSDKName = 'iphoneos' | 'iphonesimulator';

export function logPrettyItem(message: string) {
  Log.log(`${chalk.whiteBright`\u203A`} ${message}`);
}

export async function getProjectBuildSettings(
  xcodeProject: ProjectInfo,
  configuration: XcodeConfiguration,
  sdkName: XcodeSDKName,
  scheme: string
) {
  const args = [
    xcodeProject.isWorkspace ? '-workspace' : '-project',
    xcodeProject.name,
    '-scheme',
    scheme,
    '-sdk',
    sdkName,
    // getPlatformName(buildOutput),
    '-configuration',
    configuration,
    '-showBuildSettings',
    '-json',
  ];
  Log.debug(`  xcodebuild ${args.join(' ')}`);
  const { stdout } = await spawnAsync('xcodebuild', args, { stdio: 'pipe' });
  try {
    return JSON.parse(stdout);
  } catch (error) {
    // This can fail if the xcodebuild command throws a simulator error:
    // 2021-01-24 14:22:43.802 xcodebuild[73087:14664906]  DVTAssertions: Warning in /Library/Caches/com.apple.xbs/Sources/DVTiOSFrameworks/DVTiOSFrameworks-17705/DTDeviceKitBase/DTDKRemoteDeviceData.m:371
    Log.warn(error.message);
    if (error.message.match(/in JSON at position/)) {
      Log.log(chalk.dim(stdout));
    }
    return {};
  }
}

/**
 *
 * @returns '/Users/evanbacon/Library/Developer/Xcode/DerivedData/myapp-gpgjqjodrxtervaufttwnsgimhrx/Build/Products/Debug-iphonesimulator/myapp.app'
 */
export function getAppBinaryPath(buildOutput: string) {
  // Matches what's used in "Bundle React Native code and images" script.
  // Requires that `-hideShellScriptEnvironment` is not included in the build command (extra logs).

  // Like `\=/Users/evanbacon/Library/Developer/Xcode/DerivedData/Exponent-anpuosnglkxokahjhfszejloqfvo/Build/Products/Debug-iphonesimulator`
  const CONFIGURATION_BUILD_DIR = extractEnvVariableFromBuild(
    buildOutput,
    'CONFIGURATION_BUILD_DIR'
  ).sort(
    // Longer name means more suffixes, we want the shortest possible one to be first.
    // Massive projects (like Expo Go) can sometimes print multiple different sets of environment variables.
    // This can become an issue with some
    (a, b) => a.length - b.length
  );
  // Like `Exponent.app`
  const UNLOCALIZED_RESOURCES_FOLDER_PATH = extractEnvVariableFromBuild(
    buildOutput,
    'UNLOCALIZED_RESOURCES_FOLDER_PATH'
  );

  const binaryPath = path.join(
    // Use the shortest defined env variable (usually there's just one).
    CONFIGURATION_BUILD_DIR[0],
    // Use the last defined env variable.
    UNLOCALIZED_RESOURCES_FOLDER_PATH[UNLOCALIZED_RESOURCES_FOLDER_PATH.length - 1]
  );

  // If the app has a space in the name it'll fail because it isn't escaped properly by Xcode.
  return getEscapedPath(binaryPath);
}

export function getEscapedPath(filePath: string): string {
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  const unescapedPath = filePath.split(/\\ /).join(' ');
  if (fs.existsSync(unescapedPath)) {
    return unescapedPath;
  }
  throw new Error(
    `Unexpected: Generated app at path "${filePath}" cannot be read, the app cannot be installed. Please report this and build onto a simulator.`
  );
}

function extractEnvVariableFromBuild(buildOutput: string, variableName: string) {
  // Xcode can sometimes escape `=` with a backslash or put the value in quotes
  const reg = new RegExp(`export ${variableName}\\\\?=(.*)$`, 'mg');
  const matched = [...buildOutput.matchAll(reg)];

  if (!matched || !matched.length) {
    throw new CommandError(
      `Malformed xcodebuild results: "${variableName}" variable was not generated in build output. Please report this issue and run your project with Xcode instead.`
    );
  }
  return matched.map(value => value[1]).filter(Boolean) as string[];
}

function getProcessOptions({
  packager,
  shouldSkipInitialBundling,
  terminal,
  port,
}: {
  packager: boolean;
  shouldSkipInitialBundling?: boolean;
  terminal: string | undefined;
  port: number;
}): SpawnOptionsWithoutStdio {
  const SKIP_BUNDLING = shouldSkipInitialBundling ? '1' : undefined;
  if (packager) {
    return {
      env: {
        ...process.env,
        RCT_TERMINAL: terminal,
        SKIP_BUNDLING,
        RCT_METRO_PORT: port.toString(),
      },
    };
  }

  return {
    env: {
      ...process.env,
      RCT_TERMINAL: terminal,
      SKIP_BUNDLING,
      // Always skip launching the packager from a build script.
      // The script is used for people building their project directly from Xcode.
      // This essentially means "› Running script 'Start Packager'" does nothing.
      RCT_NO_LAUNCH_PACKAGER: 'true',
      // FORCE_BUNDLING: '0'
    },
  };
}

export async function buildAsync({
  projectRoot,
  xcodeProject,
  device,
  configuration,
  isSimulator,
  scheme,
  shouldSkipInitialBundling,
  terminal,
  port,
}: BuildProps): Promise<string> {
  const args = [
    xcodeProject.isWorkspace ? '-workspace' : '-project',
    xcodeProject.name,
    '-configuration',
    configuration,
    '-scheme',
    scheme,
    '-destination',
    `id=${device.udid}`,
  ];

  if (!isSimulator) {
    const developmentTeamId = await ensureDeviceIsCodeSignedForDeploymentAsync(projectRoot);
    if (developmentTeamId) {
      args.push(
        `DEVELOPMENT_TEAM=${developmentTeamId}`,
        '-allowProvisioningUpdates',
        '-allowProvisioningDeviceRegistration'
      );
    }
  }

  logPrettyItem(chalk.bold`Planning build`);
  Log.debug(`  xcodebuild ${args.join(' ')}`);
  const formatter = ExpoRunFormatter.create(projectRoot, {
    xcodeProject,
    isDebug: Log.isDebug,
  });

  return new Promise(async (resolve, reject) => {
    const buildProcess = spawn(
      'xcodebuild',
      args,
      getProcessOptions({ packager: false, shouldSkipInitialBundling, terminal, port })
    );
    let buildOutput = '';
    let errorOutput = '';

    buildProcess.stdout.on('data', (data: Buffer) => {
      const stringData = data.toString();
      buildOutput += stringData;

      const lines = formatter.pipe(stringData);
      for (const line of lines) {
        Log.log(line);
      }
    });

    buildProcess.stderr.on('data', (data: Buffer) => {
      const stringData = data instanceof Buffer ? data.toString() : data;
      errorOutput += stringData;
    });

    buildProcess.on('close', (code: number) => {
      Log.debug(`Exited with code: ${code}`);

      if (
        // User cancelled with ctrl-c
        code === null ||
        // Build interrupted
        code === 75
      ) {
        reject(new AbortCommandError());
        return;
      }

      Log.log(formatter.getBuildSummary());
      const logFilePath = writeBuildLogs(projectRoot, buildOutput, errorOutput);

      if (code !== 0) {
        // Determine if the logger found any errors;
        const wasErrorPresented = !!formatter.errors.length;

        const errorTitle = `Failed to build iOS project. "xcodebuild" exited with error code ${code}.`;

        if (wasErrorPresented) {
          // This has a flaw, if the user is missing a file, and there is a script error, only the missing file error will be shown.
          // They will only see the script error if they fix the missing file and rerun.
          // The flaw can be fixed by catching script errors in the custom logger.
          reject(new CommandError(errorTitle));
          return;
        }

        // Show all the log info because often times the error is coming from a shell script,
        // that invoked a node script, that started metro, which threw an error.
        reject(
          new CommandError(
            `${errorTitle}\nTo view more error logs, try building the app with Xcode directly, by opening ${xcodeProject.name}.\n\n` +
              buildOutput +
              '\n\n' +
              errorOutput +
              `Build logs written to ${chalk.underline(logFilePath)}`
          )
        );
        return;
      }
      resolve(buildOutput);
    });
  });
}

function writeBuildLogs(projectRoot: string, buildOutput: string, errorOutput: string) {
  const output =
    '# Build output\n\n```log\n' +
    buildOutput +
    '\n```\n\n# Error output\n\n```log\n' +
    errorOutput +
    '\n```\n';
  const [mdFilePath, logFilePath] = getErrorLogFilePath(projectRoot);

  fs.writeFileSync(mdFilePath, output);
  fs.writeFileSync(logFilePath, buildOutput);
  return mdFilePath;
}

function getErrorLogFilePath(projectRoot: string): [string, string] {
  const filename = 'xcodebuild.md';
  const folder = path.join(projectRoot, '.expo');
  fs.ensureDirSync(folder);
  return [path.join(folder, filename), path.join(folder, 'xcodebuild-output.log')];
}
