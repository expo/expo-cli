import { IOSConfig } from '@expo/config-plugins';
import { ExpoConfig } from '@expo/config-types';
import plist from '@expo/plist';
import { UserManager } from '@expo/xdl';
import fs from 'fs-extra';
import path from 'path';

import { gitAddAsync } from '../../../../git';
import log from '../../../../log';
import { ensureValidVersions } from './common';

export async function configureUpdatesAsync(projectDir: string, exp: ExpoConfig): Promise<void> {
  ensureValidVersions(exp);
  const username = await UserManager.getCurrentUsernameAsync();
  let xcodeProject = IOSConfig.XcodeUtils.getPbxproj(projectDir);

  if (!IOSConfig.Updates.isShellScriptBuildPhaseConfigured(projectDir, exp, xcodeProject)) {
    xcodeProject = IOSConfig.Updates.ensureBundleReactNativePhaseContainsConfigurationScript(
      projectDir,
      exp,
      xcodeProject
    );
    await fs.writeFile(IOSConfig.Paths.getPBXProjectPath(projectDir), xcodeProject.writeSync());
  }

  let expoPlist = await readExpoPlistAsync(projectDir);
  if (!IOSConfig.Updates.isPlistConfigurationSynced(exp, expoPlist, username)) {
    expoPlist = IOSConfig.Updates.setUpdatesConfig(exp, expoPlist, username);
    await writeExpoPlistAsync(projectDir, expoPlist);
  }
  // TODO: ensure ExpoPlist in pbxproj
}

export async function syncUpdatesConfigurationAsync(
  projectDir: string,
  exp: ExpoConfig
): Promise<void> {
  ensureValidVersions(exp);
  const username = await UserManager.getCurrentUsernameAsync();
  try {
    await ensureUpdatesConfiguredAsync(projectDir, exp);
  } catch (error) {
    log.error(
      'expo-updates module is not configured. Please run "expo eas:build:init" first to configure the project'
    );
    throw error;
  }

  let expoPlist = await readExpoPlistAsync(projectDir);
  if (!IOSConfig.Updates.isPlistVersionConfigurationSynced(exp, expoPlist)) {
    expoPlist = IOSConfig.Updates.setVersionsConfig(exp, expoPlist);
    await writeExpoPlistAsync(projectDir, expoPlist);
  }

  if (!IOSConfig.Updates.isPlistConfigurationSynced(exp, expoPlist, username)) {
    log.warn(
      'Native project configuration is not synced with values present in you app.json, run expo eas:build:init to make sure all values are applied in antive project'
    );
  }
}

export async function ensureUpdatesConfiguredAsync(
  projectDir: string,
  exp: ExpoConfig
): Promise<void> {
  const xcodeProject = IOSConfig.XcodeUtils.getPbxproj(projectDir);

  if (!IOSConfig.Updates.isShellScriptBuildPhaseConfigured(projectDir, exp, xcodeProject)) {
    const script = 'expo-updates/scripts/create-manifest-ios.sh';
    const buildPhase = '"Bundle React Native code and images"';
    throw new Error(`Path to ${script} is missing in a ${buildPhase} build phase.`);
  }

  const expoPlist = await readExpoPlistAsync(projectDir);
  if (!IOSConfig.Updates.isPlistConfigurationSet(expoPlist)) {
    throw new Error('Missing values in Expo.plist');
  }
}

async function readExpoPlistAsync(projectDir: string): Promise<IOSConfig.ExpoPlist> {
  const expoPlistPath = IOSConfig.Paths.getExpoPlistPath(projectDir);

  let expoPlist = {};
  if (await fs.pathExists(expoPlistPath)) {
    const expoPlistContent = await fs.readFile(expoPlistPath, 'utf8');
    expoPlist = plist.parse(expoPlistContent);
  }
  return expoPlist;
}

async function writeExpoPlistAsync(
  projectDir: string,
  expoPlist: IOSConfig.ExpoPlist
): Promise<void> {
  const expoPlistPath = IOSConfig.Paths.getExpoPlistPath(projectDir);
  const expoPlistContent = plist.build(expoPlist);

  await fs.mkdirp(path.dirname(expoPlistPath));
  await fs.writeFile(expoPlistPath, expoPlistContent);
  await gitAddAsync(expoPlistPath, { intentToAdd: true });
}
