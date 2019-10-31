import fs from 'fs-extra';
import path from 'path';
import rimraf from 'rimraf';
import get from 'lodash/get';
import has from 'lodash/has';
import pascalCase from 'pascal-case';

import {
  getManifestAsync,
  spawnAsync,
  spawnAsyncThrowError,
  parseSdkMajorVersion,
} from './ExponentTools';
import * as IosNSBundle from './IosNSBundle';
import * as IosWorkspace from './IosWorkspace';
import StandaloneBuildFlags from './StandaloneBuildFlags';
import StandaloneContext from './StandaloneContext';
import logger from './Logger';

export const EXPOKIT_APP = 'ExpoKitApp';
export const EXPONENT_APP = 'Exponent';

function _validateCLIArgs(args) {
  args.type = args.type || 'archive';
  args.configuration = args.configuration || 'Release';
  args.verbose = args.verbose || false;
  args.testEnvironment = args.testEnvironment || 'none';

  switch (args.type) {
    case 'simulator': {
      if (args.configuration !== 'Debug' && args.configuration !== 'Release') {
        throw new Error(`Unsupported build configuration ${args.configuration}`);
      }
      break;
    }
    case 'archive': {
      if (args.configuration !== 'Release') {
        throw new Error('Release is the only supported configuration when archiving');
      }
      break;
    }
    case 'client':
      break;
    default: {
      throw new Error(`Unsupported build type ${args.type}`);
    }
  }

  switch (args.action) {
    case 'configure': {
      if (args.type === 'client') {
        break;
      }

      if (!args.url) {
        throw new Error('Must run with `--url MANIFEST_URL`');
      }
      if (!args.sdkVersion) {
        throw new Error('Must run with `--sdkVersion SDK_VERSION`');
      }
      if (!args.archivePath) {
        throw new Error(
          'Need to provide --archivePath <path to existing archive for configuration>'
        );
      }
      if (
        args.testEnvironment !== 'local' &&
        args.testEnvironment !== 'ci' &&
        args.testEnvironment !== 'none'
      ) {
        throw new Error(`Unsupported test environment ${args.testEnvironment}`);
      }
      break;
    }
    case 'build': {
      break;
    }
    case 'create-workspace': {
      break;
    }
    default: {
      throw new Error(`Unsupported build action ${args.action}`);
    }
  }

  return args;
}

/**
 *  Build the iOS workspace at the given path.
 *  @return the path to the resulting build artifact
 */
async function _buildAsync(
  projectName,
  workspacePath,
  configuration,
  type,
  relativeBuildDestination,
  verbose,
  useModernBuildSystem = false
) {
  const modernBuildSystemFragment = `-UseModernBuildSystem=${useModernBuildSystem ? 'YES' : 'NO'}`;
  const buildDest = `${relativeBuildDestination}-${type}`;
  let buildCmd = `set -o pipefail && xcodebuild -workspace ${projectName}.xcworkspace -scheme ${projectName} -configuration ${configuration} -derivedDataPath ${buildDest} ${modernBuildSystemFragment}`,
    pathToArtifact;
  if (type === 'simulator') {
    buildCmd += ` -sdk iphonesimulator CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO ARCHS="i386 x86_64" ONLY_ACTIVE_ARCH=NO | xcpretty`;
    pathToArtifact = path.join(
      buildDest,
      'Build',
      'Products',
      `${configuration}-iphonesimulator`,
      `${projectName}.app`
    );
  } else if (type === 'archive') {
    buildCmd += ` -sdk iphoneos -destination generic/platform=iOS archive -archivePath ${buildDest}/${projectName}.xcarchive CODE_SIGNING_ALLOWED=NO | xcpretty`;
    pathToArtifact = path.join(buildDest, `${projectName}.xcarchive`);
  } else {
    throw new Error(`Unsupported build type: ${type}`);
  }

  logger.info(`Building iOS workspace at ${workspacePath} to ${buildDest}:\n`);
  logger.info(buildCmd);
  if (!verbose) {
    logger.info(
      '\nxcodebuild is running. Logging errors only. To see full output, use --verbose 1...'
    );
  }
  await spawnAsyncThrowError(buildCmd, null, {
    // only stderr
    stdio: verbose ? 'inherit' : ['ignore', 'ignore', 'inherit'],
    cwd: workspacePath,
    shell: true,
  });
  return path.resolve(workspacePath, pathToArtifact);
}

async function _podInstallAsync(workspacePath, isRepoUpdateEnabled) {
  // ensure pods are clean
  const pathsToClean = [path.join(workspacePath, 'Pods'), path.join(workspacePath, 'Podfile.lock')];
  pathsToClean.forEach(path => {
    if (fs.existsSync(path)) {
      rimraf.sync(path);
    }
  });

  // Disable cocoapod stats to speed up the install
  const COCOAPODS_DISABLE_STATS = process.env.COCOAPODS_DISABLE_STATS;
  process.env.COCOAPODS_DISABLE_STATS = true;

  // install
  let cocoapodsArgs = ['install'];
  if (isRepoUpdateEnabled) {
    cocoapodsArgs.push('--repo-update');
  }
  logger.info('Installing iOS workspace dependencies...');
  logger.info(`pod ${cocoapodsArgs.join(' ')}`);
  try {
    await spawnAsyncThrowError('pod', cocoapodsArgs, {
      stdio: 'inherit',
      cwd: workspacePath,
    });
  } finally {
    // Revert the stats to the user preference
    process.env.COCOAPODS_DISABLE_STATS = COCOAPODS_DISABLE_STATS;
  }
}

/**
 * @param workspacePath optionally provide a path for the unbuilt xcode workspace to create/use.
 * @param expoSourcePath path to expo client app sourcecode (/ios dir from expo/expo repo)
 * @param shellAppSdkVersion sdk version for shell app
 */
async function _createStandaloneContextAsync(args) {
  // right now we only ever build a single detached workspace for service contexts.
  // TODO: support multiple different pod configurations, assemble a cache of those builds.
  const expoSourcePath = args.expoSourcePath || '../ios';
  let workspaceSourcePath;
  if (args.workspacePath) {
    workspaceSourcePath = args.workspacePath;
  } else {
    workspaceSourcePath = path.join(expoSourcePath, '..', 'shellAppWorkspaces', 'default', 'ios');
  }
  let { privateConfigFile, privateConfigData } = args;

  let privateConfig;
  if (privateConfigData) {
    privateConfig = privateConfigData;
  } else if (privateConfigFile) {
    let privateConfigContents = await fs.readFile(privateConfigFile, 'utf8');
    privateConfig = JSON.parse(privateConfigContents);
  }

  let manifest;
  if (args.manifest) {
    manifest = args.manifest;
    logger
      .withFields({ buildPhase: 'reading manifest' })
      .info('Using manifest:', JSON.stringify(manifest));
  } else if (args.url && args.sdkVersion) {
    const { url, sdkVersion, releaseChannel } = args;
    manifest = await getManifestAsync(url, {
      'Exponent-SDK-Version': sdkVersion,
      'Exponent-Platform': 'ios',
      'Expo-Release-Channel': releaseChannel ? releaseChannel : 'default',
      Accept: 'application/expo+json,application/json',
    });
  }

  let bundleExecutable = args.type === 'client' ? EXPONENT_APP : EXPOKIT_APP;
  if (has(manifest, 'ios.infoPlist.CFBundleExecutable')) {
    bundleExecutable = get(manifest, 'ios.infoPlist.CFBundleExecutable');
  } else if (privateConfig && privateConfig.bundleIdentifier) {
    bundleExecutable = pascalCase(privateConfig.bundleIdentifier);
  }

  const buildFlags = StandaloneBuildFlags.createIos(args.configuration, {
    workspaceSourcePath,
    appleTeamId: args.appleTeamId,
    buildType: args.type,
    bundleExecutable,
  });
  const context = StandaloneContext.createServiceContext(
    expoSourcePath,
    args.archivePath,
    manifest,
    privateConfig,
    args.testEnvironment,
    buildFlags,
    args.url,
    args.releaseChannel,
    args.shellAppSdkVersion
  );
  return context;
}

/**
 * possible args:
 *  @param url manifest url for shell experience
 *  @param sdkVersion sdk to use when requesting the manifest
 *  @param releaseChannel channel to pull manifests from, default is 'default'
 *  @param archivePath path to existing NSBundle to configure
 *  @param privateConfigFile path to a private config file containing, e.g., private api keys
 *  @param appleTeamId Apple Developer's account Team ID
 *  @param output specify the output path of the configured archive (ie) /tmp/my-app-archive-build.xcarchive or /tmp/my-app-ios-build.tar.gz
 *  @param type type of artifact to configure (simulator or archive)
 *  @param expoSourcePath path to expo client app sourcecode (/ios dir from expo/expo repo)
 */
async function configureAndCopyArchiveAsync(args) {
  args = _validateCLIArgs(args);
  const { output, type } = args;
  const context = await _createStandaloneContextAsync(args);
  await IosNSBundle.configureAsync(context);
  if (output) {
    const workspaceName = type === 'client' ? EXPONENT_APP : EXPOKIT_APP;
    if (context.build.ios.bundleExecutable !== workspaceName) {
      await spawnAsync('/bin/mv', [workspaceName, context.build.ios.bundleExecutable], {
        pipeToLogger: true,
        cwd: context.data.archivePath,
        loggerFields: { buildPhase: 'renaming bundle executable' },
      });
    }
    if (type === 'simulator') {
      const archiveName = context.config.slug.replace(/[^0-9a-z_-]/gi, '_');
      const appReleasePath = path.resolve(context.data.archivePath, '..');
      await spawnAsync(
        `mv ${workspaceName}.app ${archiveName}.app && tar -czvf ${output} ${archiveName}.app`,
        null,
        {
          stdoutOnly: true,
          pipeToLogger: true,
          loggerFields: { buildPhase: 'creating an archive for simulator' },
          cwd: appReleasePath,
          shell: true,
        }
      );
    } else if (type === 'archive' || type === 'client') {
      await spawnAsync('/bin/mv', [`${workspaceName}.xcarchive`, output], {
        pipeToLogger: true,
        cwd: path.join(context.data.archivePath, '../../../..'),
        loggerFields: { buildPhase: 'renaming archive' },
      });
    }
  }
  return context.data.manifest;
}

/**
 * possible args:
 *  @param skipRepoUpdate if true, omit `--repo-update` cocoapods flag.
 */
async function _createTurtleWorkspaceAsync(context, args) {
  const { skipRepoUpdate } = args;
  if (fs.existsSync(context.build.ios.workspaceSourcePath)) {
    logger.info(`Removing existing workspace at ${context.build.ios.workspaceSourcePath}...`);
    try {
      rimraf.sync(context.build.ios.workspaceSourcePath);
    } catch (_) {}
  }
  await IosWorkspace.createDetachedAsync(context);
  await _podInstallAsync(context.build.ios.workspaceSourcePath, !skipRepoUpdate);
}

/**
 * External-facing version can be used to create a turtle workspace without building it.
 * Probably only useful for local testing.
 *
 * @param workspacePath (optional) provide some other path to create the workspace besides the default
 * @param url (optional, with sdkVersion) url to an expo manifest, if you want the workspace to be configured automatically
 * @param sdkVersion (optional, with url) sdkVersion to an expo manifest, if you want the workspace to be configured automatically
 */
async function createTurtleWorkspaceAsync(args) {
  args = _validateCLIArgs(args);
  if (!args.workspacePath) {
    logger.info(
      'No workspace path was provided with --workspacePath, so the default will be used.'
    );
  }
  const context = await _createStandaloneContextAsync(args);
  await _createTurtleWorkspaceAsync(context, args);
  logger.info(
    `Created turtle workspace at ${context.build.ios
      .workspaceSourcePath}. You can open and run this in Xcode.`
  );
  if (context.config) {
    await IosNSBundle.configureAsync(context);
    logger.info(
      `The turtle workspace was configured for the url ${args.url}. To run this app with a Debug scheme, make sure to add a development url to 'EXBuildConstants.plist'.`
    );
  } else {
    logger.info(
      `You can specify --url <manifestUrl> --sdkVersion <version> to configure this workspace as a particular Expo app.\n\nBecause those arguments were omitted, the workspace has not been configured. It will compile but not run. The minimum configuration to get something running is to specify a manifest url in 'EXShell.plist' (for Release builds) or 'EXBuildConstants.plist' (for Debug builds).`
    );
  }
}

/**
 * possible args:
 *  @param configuration StandaloneBuildConfiguration (Debug or Release)
 *  @param verbose show all xcodebuild output (default false)
 *  @param reuseWorkspace if true, when building, assume a detached workspace already exists rather than creating a new one.
 *  @param type type of artifact to build (simulator or archive)
 *  @param shellAppSdkVersion sdk version for shell app
 */
async function buildAndCopyArtifactAsync(args) {
  args = _validateCLIArgs(args);
  const context = await _createStandaloneContextAsync(args);
  const { verbose, type, reuseWorkspace } = args;
  const { projectName } = IosWorkspace.getPaths(context);

  if (!reuseWorkspace) {
    await _createTurtleWorkspaceAsync(context, args);
  }
  const pathToArtifact = await _buildAsync(
    projectName,
    context.build.ios.workspaceSourcePath,
    context.build.configuration,
    type,
    path.relative(context.build.ios.workspaceSourcePath, '../shellAppBase'),
    verbose,
    parseSdkMajorVersion(args.shellAppSdkVersion) > 33
  );
  const artifactDestPath = path.join('../shellAppBase-builds', type, context.build.configuration);
  logger.info(`\nFinished building, copying artifact to ${path.resolve(artifactDestPath)}...`);
  if (fs.existsSync(artifactDestPath)) {
    await spawnAsyncThrowError('/bin/rm', ['-rf', artifactDestPath]);
  }
  logger.info(`mkdir -p ${artifactDestPath}`);
  await spawnAsyncThrowError('/bin/mkdir', ['-p', artifactDestPath]);
  logger.info(`cp -R ${pathToArtifact} ${artifactDestPath}`);
  await spawnAsyncThrowError('/bin/cp', ['-R', pathToArtifact, artifactDestPath]);
}

export { buildAndCopyArtifactAsync, configureAndCopyArchiveAsync, createTurtleWorkspaceAsync };
