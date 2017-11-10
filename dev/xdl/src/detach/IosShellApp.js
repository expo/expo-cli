// Copyright 2015-present 650 Industries. All rights reserved.

'use strict';

import 'instapromise';

import fs from 'fs';
import path from 'path';
import { getManifestAsync, spawnAsync, spawnAsyncThrowError } from './ExponentTools';

import * as IosNSBundle from './IosNSBundle';
import StandaloneContext from './StandaloneContext';

function validateConfigArguments(manifest, cmdArgs, configFilePath) {
  if (!configFilePath) {
    throw new Error('No path to config files provided');
  }
  let bundleIdentifierFromManifest = manifest.ios ? manifest.ios.bundleIdentifier : null;
  if (!bundleIdentifierFromManifest) {
    throw new Error('No bundle identifier found in either the manifest or argv');
  }
  if (!manifest.name) {
    throw new Error('Manifest does not have a name');
  }

  if (!cmdArgs.privateConfigFile) {
    console.warn('Warning: No config file specified.');
  }
  return true;
}

/**
 * Writes Fabric config to private-shell-app-config.json if necessary. Used by
 * generate-dynamic-macros when building.
 */
async function configureShellAppSecretsAsync(args, iosDir) {
  if (!args.privateConfigFile) {
    return;
  }

  spawnAsyncThrowError('/bin/cp', [
    args.privateConfigFile,
    path.join(iosDir, 'private-shell-app-config.json'),
  ]);
}

/**
 *  Build the iOS binary from source.
 *  @return the path to the resulting .app
 */
async function buildAsync(args, iOSRootPath, relativeBuildDestination) {
  let { action, configuration, verbose, type } = args;

  let buildCmd, buildDest, pathToApp;
  if (type === 'simulator') {
    buildDest = path.relative(iOSRootPath, `${relativeBuildDestination}-simulator`);
    buildCmd = `xcodebuild -workspace Exponent.xcworkspace -scheme Exponent -sdk iphonesimulator -configuration ${configuration} -derivedDataPath ${buildDest} CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO ARCHS="i386 x86_64" ONLY_ACTIVE_ARCH=NO | xcpretty`;
    pathToApp = `${buildDest}/Build/Products/${configuration}-iphonesimulator/Exponent.app`;
  } else if (type === 'archive') {
    buildDest = path.relative(iOSRootPath, `${relativeBuildDestination}-archive`);
    buildCmd = `xcodebuild -workspace Exponent.xcworkspace -scheme Exponent -sdk iphoneos -destination generic/platform=iOS -configuration ${configuration} archive -derivedDataPath ${buildDest} -archivePath ${buildDest}/Exponent.xcarchive CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO | xcpretty`;
    pathToApp = `${buildDest}/Exponent.xcarchive/Products/Applications/Exponent.app`;
  }

  if (buildCmd) {
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
      cwd: iOSRootPath,
      shell: true,
    });

    const artifactLocation = path.join(iOSRootPath, '../shellAppBase-builds', type, configuration);
    await spawnAsyncThrowError('/bin/rm', ['-rf', artifactLocation]);
    await spawnAsyncThrowError('/bin/mkdir', ['-p', artifactLocation]);

    console.log(`\nFinished building, copying artifact to ${artifactLocation}...`);
    if (type === 'archive') {
      await spawnAsyncThrowError('/bin/cp', [
        '-R',
        `${buildDest}/Exponent.xcarchive`,
        artifactLocation,
      ]);
    } else if (type === 'simulator') {
      await spawnAsyncThrowError('/bin/cp', ['-R', pathToApp, artifactLocation]);
    }
  }
  return pathToApp;
}

function validateArgs(args) {
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

async function configureIOSShellAppAsync(args, manifest) {
  const expoSourcePath = '../ios';
  let { privateConfigFile } = args;

  let privateConfig;
  if (privateConfigFile) {
    let privateConfigContents = await fs.promise.readFile(privateConfigFile, 'utf8');
    privateConfig = JSON.parse(privateConfigContents);
  }

  // make sure we have all the required info
  validateConfigArguments(manifest, args, args.archivePath);
  const context = StandaloneContext.createServiceContext(
    expoSourcePath,
    args.archivePath,
    manifest,
    privateConfig,
    args.configuration,
    args.url,
    args.releaseChannel,
    null
  );
  await IosNSBundle.configureAsync(context);
}

async function moveShellAppArchiveAsync(args, manifest) {
  const { archivePath, output, type } = args;
  const archiveName = manifest.name.replace(/[^0-9a-z_\-\.]/gi, '_');
  const appReleasePath = path.resolve(path.join(`${archivePath}`, '..'));
  if (type === 'simulator') {
    await spawnAsync(
      `mv Exponent.app ${archiveName}.app && tar -czvf ${output} ${archiveName}.app`,
      null,
      {
        stdio: 'inherit',
        cwd: appReleasePath,
        shell: true,
      }
    );
  } else if (type === 'archive') {
    await spawnAsync('/bin/mv', ['Exponent.xcarchive', output], {
      stdio: 'inherit',
      cwd: `${archivePath}/../../../..`,
    });
  }
  return;
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
*/
async function createIOSShellAppAsync(args) {
  args = validateArgs(args);

  if (args.action === 'build') {
    await configureShellAppSecretsAsync(args, '../ios');
    await buildAsync(args, '../ios', '../shellAppBase');
  } else if (args.action === 'configure') {
    let { url, sdkVersion } = args;
    let manifest = await getManifestAsync(url, {
      'Exponent-SDK-Version': sdkVersion,
      'Exponent-Platform': 'ios',
      'Expo-Release-Channel': args.releaseChannel ? args.releaseChannel : 'default',
    });
    await configureIOSShellAppAsync(args, manifest);
    if (args.output) {
      await moveShellAppArchiveAsync(args, manifest);
    }
  }

  return;
}

export { createIOSShellAppAsync };
