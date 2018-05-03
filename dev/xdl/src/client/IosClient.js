// Copyright 2015-present 650 Industries. All rights reserved.

'use strict';

import fs from 'fs-extra';
import path from 'path';

import { spawnAsync, spawnAsyncThrowError } from '../detach/ExponentTools';
import * as IosPlist from '../detach/IosPlist';
import logger from '../detach/Logger';

/**
 *  Build the iOS workspace at the given path.
 *  @return the path to the resulting build artifact
 */
async function _buildAsync(workspacePath, configuration, type, derivedDataPath, verbose) {
  let buildCmd, pathToArtifact;
  const projectName = 'Exponent';
  if (type === 'simulator') {
    buildCmd = `xcodebuild -workspace ${projectName}.xcworkspace -scheme ${projectName} -sdk iphonesimulator -configuration ${configuration} -derivedDataPath ${derivedDataPath} CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO ARCHS="i386 x86_64" ONLY_ACTIVE_ARCH=NO | xcpretty`;
    pathToArtifact = path.join(
      derivedDataPath,
      'Build',
      'Products',
      `${configuration}-iphonesimulator`,
      `${projectName}.app`
    );
  } else if (type === 'archive') {
    buildCmd = `xcodebuild -workspace ${projectName}.xcworkspace -scheme ${projectName} -sdk iphoneos -destination generic/platform=iOS -configuration ${configuration} archive -derivedDataPath ${derivedDataPath} -archivePath ${derivedDataPath}/${projectName}.xcarchive CODE_SIGN_IDENTITY="" CODE_SIGNING_REQUIRED=NO | xcpretty`;
    pathToArtifact = path.join(derivedDataPath, `${projectName}.xcarchive`);
  } else {
    throw new Error(`Unsupported build type: ${type}`);
  }

  logger.info(
    `Building iOS workspace at ${workspacePath} with derived data path ${derivedDataPath}:\n`
  );
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

async function _configureExpoClientBundleAsync(pathToArchive, bundleId, appleTeamIdentifierPrefix) {
  // configure bundle id in Info.plist
  await IosPlist.modifyAsync(pathToArchive, 'Info', infoPlist => {
    infoPlist.CFBundleIdentifier = bundleId;
    return infoPlist;
  });

  // replace all instances of expo entitlement with custom bundle id entitlement
  let entitlementsFile = path.join(pathToArchive, 'Exponent.entitlements');
  if (fs.existsSync(entitlementsFile)) {
    let entitlementsFileContents = await fs.readFile(entitlementsFile, 'utf8');
    entitlementsFileContents = entitlementsFileContents.replace(/host\.exp\.Exponent/g, bundleId);
    entitlementsFileContents = entitlementsFileContents.replace(
      /\$\(CFBundleIdentifier\)/g,
      bundleId
    );
    if (appleTeamIdentifierPrefix) {
      entitlementsFileContents = entitlementsFileContents.replace(
        /\$\(TeamIdentifierPrefix\)/g,
        appleTeamIdentifierPrefix
      );
    }
    await fs.writeFile(entitlementsFile, entitlementsFileContents);
  }
}

async function _buildAndCopyClientArtifactAsync(buildType, buildConfiguration, verbose) {
  const clientWorkspacePath = path.join('..', 'ios');
  let buildPath = path.join('..', 'client-builds');
  let derivedDataPath = path.join(buildPath, 'derived-data', buildType);

  const pathToArtifact = await _buildAsync(
    clientWorkspacePath,
    buildConfiguration,
    buildType,
    path.relative(clientWorkspacePath, derivedDataPath),
    verbose
  );
  const artifactDestPath = path.join(buildPath, 'artifacts', buildType, buildConfiguration);
  logger.info(`\nFinished building, copying artifact to ${path.resolve(artifactDestPath)}...`);
  if (fs.existsSync(artifactDestPath)) {
    await spawnAsyncThrowError('/bin/rm', ['-rf', artifactDestPath]);
  }
  logger.info(`mkdir -p ${artifactDestPath}`);
  await spawnAsyncThrowError('/bin/mkdir', ['-p', artifactDestPath]);
  logger.info(`cp -R ${pathToArtifact} ${artifactDestPath}`);
  await spawnAsyncThrowError('/bin/cp', ['-R', pathToArtifact, artifactDestPath]);
}

async function buildAsync(buildType, buildConfiguration, verbose) {
  if (!(buildType === 'simulator' || buildType == 'archive')) {
    throw new Error(`Unsupported build type: ${buildType}`);
  }
  if (!(buildConfiguration === 'debug' || buildConfiguration == 'release')) {
    throw new Error(`Unsupported build configuration: ${buildConfiguration}`);
  }
  return _buildAndCopyClientArtifactAsync(buildType, buildConfiguration, verbose);
}

async function configureBundleAsync(pathToArchive, bundleId, appleTeamId) {
  if (!pathToArchive) {
    throw new Error('Must specify path to Expo Client archive to configure.');
  }
  if (!bundleId) {
    throw new Error('Must specify a bundle identifier to write.');
  }
  if (!appleTeamId) {
    logger.warn(
      'No apple team id was specified. This may lead to unexpected behavior with the resulting Entitlements.'
    );
  }
  return _configureExpoClientBundleAsync(pathToArchive, bundleId, appleTeamId);
}

export { buildAsync, configureBundleAsync };
