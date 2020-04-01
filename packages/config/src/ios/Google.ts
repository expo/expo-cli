import path from 'path';
import fs from 'fs-extra';

import { ExpoConfig } from '../Config.types';
import { InfoPlist } from './IosConfig.types';
import { appendScheme } from './Scheme';
import { addFileToGroup, getPbxproj, getProjectName, getSourceRoot } from './utils/Xcodeproj';

export function getGoogleMapsApiKey(config: ExpoConfig) {
  return config.ios?.config?.googleMapsApiKey ?? null;
}

// NOTE(brentvatne): if the developer has installed the google ads sdk and does
// not provide an app id their app will crash. Standalone apps get around this by
// providing some default value, we will instead here assume that the user can
// do the right thing if they have installed the package. This is a slight discrepancy
// that arises in ejecting because it's possible for the package to be installed and
// not crashing in the managed workflow, then you eject and the app crashes because
// you don't have an id to fall back to.
export function getGoogleMobileAdsAppId(config: ExpoConfig) {
  return config.ios?.config?.googleMobileAdsAppId ?? null;
}

export function getGoogleSignInReservedClientId(config: ExpoConfig) {
  return config.ios?.config?.googleSignIn?.reservedClientId ?? null;
}

export function getGoogleServicesFile(config: ExpoConfig) {
  return config.ios?.googleServicesFile ?? null;
}

export function setGoogleMapsApiKey(config: ExpoConfig, infoPlist: InfoPlist) {
  let apiKey = getGoogleMapsApiKey(config);

  if (apiKey === null) {
    return infoPlist;
  }

  return {
    ...infoPlist,
    GMSApiKey: apiKey,
  };
}

export function setGoogleMobileAdsAppId(config: ExpoConfig, infoPlist: InfoPlist) {
  let appId = getGoogleMobileAdsAppId(config);

  if (appId === null) {
    return infoPlist;
  }

  return {
    ...infoPlist,
    GADApplicationIdentifier: appId,
  };
}

export function setGoogleSignInReservedClientId(config: ExpoConfig, infoPlist: InfoPlist) {
  let reservedClientId = getGoogleSignInReservedClientId(config);

  if (reservedClientId === null) {
    return infoPlist;
  }

  return appendScheme(reservedClientId, infoPlist);
}

export function setGoogleConfig(config: ExpoConfig, infoPlist: InfoPlist) {
  infoPlist = setGoogleMapsApiKey(config, infoPlist);
  infoPlist = setGoogleMobileAdsAppId(config, infoPlist);
  infoPlist = setGoogleSignInReservedClientId(config, infoPlist);
  return infoPlist;
}

export function setGoogleServicesFile(config: ExpoConfig, projectRoot: string) {
  let googleServicesFileRelativePath = getGoogleServicesFile(config);
  if (googleServicesFileRelativePath === null) {
    return;
  }

  let googleServiceFilePath = path.resolve(projectRoot, googleServicesFileRelativePath);
  fs.copyFileSync(
    googleServiceFilePath,
    path.join(getSourceRoot(projectRoot), 'GoogleService-Info.plist')
  );

  let project = getPbxproj(projectRoot);
  let projectName = getProjectName(projectRoot);
  project = addFileToGroup(`${projectName}/GoogleService-Info.plist`, projectName, project);
  fs.writeFileSync(project.filepath, project.writeSync());
}
