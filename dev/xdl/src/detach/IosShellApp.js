// Copyright 2015-present 650 Industries. All rights reserved.

'use strict';

import fs from 'fs-extra';
import path from 'path';
import rimraf from 'rimraf';
import { getManifestAsync, spawnAsync, spawnAsyncThrowError } from './ExponentTools';

import * as IosNSBundle from './IosNSBundle';
import * as IosWorkspace from './IosWorkspace';
import StandaloneBuildFlags from './StandaloneBuildFlags';
import StandaloneContext from './StandaloneContext';

/**
 * Writes private config to private-shell-app-config.json if necessary. Used by
 * generate-dynamic-macros when building.
 * TODO: remove
 */
async function _writePrivateConfigForBuildAsync(args, iosWorkspaceDir) {
  if (!args.privateConfigFile) {
    return;
  }

  spawnAsyncThrowError('/bin/cp', [
    args.privateConfigFile,
    path.join(iosWorkspaceDir, 'private-shell-app-config.json'),
  ]);
}

/**
 *  Build the iOS workspace at the given path.
 *  @return the path to the resulting build artifact
 */
async function _buildAsync(workspacePath, configuration, type, relativeBuildDestination, verbose) {
  let buildCmd, pathToArtifact;
  const buildDest = `${relativeBuildDestination}-${type}`;
  if (type === 'simulator') {
    buildCmd = `xcodebuild -workspace Exponent.xcworkspace -scheme Exponent -sdk iphonesimulator -configuration ${configuration} -derivedDataPath ${buildDest} CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO ARCHS="i386 x86_64" ONLY_ACTIVE_ARCH=NO | xcpretty`;
    pathToArtifact = path.join(
      buildDest,
      'Build',
      'Products',
      `${configuration}-iphonesimulator`,
      'Exponent.app'
    );
  } else if (type === 'archive') {
    buildCmd = `xcodebuild -workspace Exponent.xcworkspace -scheme Exponent -sdk iphoneos -destination generic/platform=iOS -configuration ${configuration} archive -derivedDataPath ${buildDest} -archivePath ${buildDest}/Exponent.xcarchive CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO | xcpretty`;
    pathToArtifact = path.join(buildDest, 'Exponent.xcarchive');
  } else {
    throw new Error(`Unsupported build type: ${type}`);
  }

  console.log(`Building shell app under ${buildDest}:\n`);
  console.log(buildCmd);
  if (!verbose) {
    console.log(
      '\nxcodebuild is running. Logging errors only. To see full output, use --verbose 1...'
    );
  }
  await spawnAsyncThrowError(buildCmd, null, {
    // only stderr
    stdio: verbose ? 'inherit' : ['ignore', 'ignore', 'inherit'],
    cwd: workspacePath,
    shell: true,
  });
  return pathToArtifact;
}

async function _podInstallAsync(workspacePath, isRepoUpdateEnabled) {
  // ensure pods are clean
  const pathsToClean = [path.join(workspacePath, 'Pods'), path.join(workspacePath, 'Podfile.lock')];
  pathsToClean.forEach(path => {
    if (fs.existsSync(path)) {
      rimraf.sync(path);
    }
  });

  // install
  let cocoapodsArgs = ['install'];
  if (isRepoUpdateEnabled) {
    cocoapodsArgs.push('--repo-update');
  }
  console.log('Installing iOS workspace dependencies...');
  console.log(`pod ${cocoapodsArgs.join(' ')}`);
  await spawnAsyncThrowError('pod', cocoapodsArgs, {
    stdio: 'inherit',
    cwd: workspacePath,
  });
  return;
}

function _validateCLIArgs(args) {
  args.type = args.type || 'archive';
  args.configuration = args.configuration || 'Release';
  args.verbose = args.verbose || false;

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
    default: {
      throw new Error(`Unsupported build type ${args.type}`);
    }
  }

  switch (args.action) {
    case 'configure': {
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
      break;
    }
    case 'build': {
      break;
    }
    default: {
      throw new Error(`Unsupported build action ${args.action}`);
    }
  }

  return args;
}

async function _createStandaloneContextAsync(args, workspaceSourcePath) {
  const expoSourcePath = '../ios';
  let { privateConfigFile } = args;

  let privateConfig;
  if (privateConfigFile) {
    let privateConfigContents = await fs.readFile(privateConfigFile, 'utf8');
    privateConfig = JSON.parse(privateConfigContents);
  }

  let manifest;
  if (args.action === 'configure') {
    const { url, sdkVersion, releaseChannel } = args;
    manifest = await getManifestAsync(url, {
      'Exponent-SDK-Version': sdkVersion,
      'Exponent-Platform': 'ios',
      'Expo-Release-Channel': releaseChannel ? releaseChannel : 'default',
    });
  }

  const buildFlags = StandaloneBuildFlags.createIos(args.configuration, { workspaceSourcePath });
  const context = StandaloneContext.createServiceContext(
    expoSourcePath,
    args.archivePath,
    manifest,
    privateConfig,
    buildFlags,
    args.url,
    args.releaseChannel
  );
  return context;
}

async function _moveConfiguredArchiveAsync(archivePath, destination, type, manifest) {
  const archiveName = manifest.name.replace(/[^0-9a-z_\-\.]/gi, '_');
  const appReleasePath = path.resolve(path.join(`${archivePath}`, '..'));
  if (type === 'simulator') {
    await spawnAsync(
      `mv Exponent.app ${archiveName}.app && tar -czvf ${destination} ${archiveName}.app`,
      null,
      {
        stdio: 'inherit',
        cwd: appReleasePath,
        shell: true,
      }
    );
  } else if (type === 'archive') {
    await spawnAsync('/bin/mv', ['Exponent.xcarchive', destination], {
      stdio: 'inherit',
      cwd: `${archivePath}/../../../..`,
    });
  }
}

/**
*  @param url manifest url for shell experience
*  @param sdkVersion sdk to use when requesting the manifest
*  @param action
*    build - build a binary
*    configure - don't build anything, just configure the files in an existing .app bundle
*  @param type simulator or archive
*  @param releaseChannel channel to pull manifests from, default is 'default'
*  @param configuration Debug or Release, for type == simulator (default Release)
*  @param archivePath path to existing bundle, for action == configure
*  @param privateConfigFile path to a private config file containing, e.g., private api keys
*  @param verbose show all xcodebuild output (default false)
*  @param output specify the output path of built project (ie) /tmp/my-app-archive-build.xcarchive or /tmp/my-app-ios-build.tar.gz
*  @param skipRepoUpdate if true, when building, omit `--repo-update` cocoapods flag.
*/
async function createIOSShellAppAsync(args) {
  args = _validateCLIArgs(args);

  // right now we only ever build a single detached workspace for service contexts.
  // TODO: support multiple different pod configurations, assemble a cache of those builds.
  const expoSourcePath = '../ios';
  const context = await _createStandaloneContextAsync(
    args,
    path.join(expoSourcePath, '..', 'shellAppWorkspaces', 'ios', 'default')
  );

  if (args.action === 'build') {
    const { configuration, verbose, type } = args;
    await IosWorkspace.createDetachedAsync(context);
    await _writePrivateConfigForBuildAsync(args, context.build.ios.workspaceSourcePath);
    await _podInstallAsync(context.build.ios.workspaceSourcePath, !args.skipRepoUpdate);
    const pathToArtifact = await _buildAsync(
      context.build.ios.workspaceSourcePath,
      configuration,
      type,
      path.relative(context.build.ios.workspaceSourcePath, '../shellAppBase'),
      verbose
    );
    const artifactDestPath = path.join('../shellAppBase-builds', type, configuration);
    console.log(`\nFinished building, copying artifact to ${artifactDestPath}...`);
    if (fs.existsSync(artifactDestPath)) {
      await spawnAsyncThrowError('/bin/rm', ['-rf', artifactDestPath]);
      await spawnAsyncThrowError('/bin/mkdir', ['-p', artifactDestPath]);
    }
    await spawnAsyncThrowError('/bin/cp', ['-R', pathToArtifact, artifactDestPath]);
  } else if (args.action === 'configure') {
    const { archivePath, output, type } = args;
    await IosNSBundle.configureAsync(context);
    if (output) {
      await _moveConfiguredArchiveAsync(archivePath, output, type, context.manifest);
    }
  }
}

export { createIOSShellAppAsync };
