import { InfoPlist } from './IosConfig.types';
import { ExpoConfig } from '../Config.types';
import { appendScheme } from './Scheme';

/**
 * Getters
 * TODO: these getters are the same between ios/android, we could reuse them
 */

export function getFacebookScheme(config: ExpoConfig) {
  return config.facebookScheme ?? null;
}

export function getFacebookAppId(config: ExpoConfig) {
  return config.facebookAppId ?? null;
}

export function getFacebookDisplayName(config: ExpoConfig) {
  return config.facebookDisplayName ?? null;
}
export function getFacebookAutoInitEnabled(config: ExpoConfig) {
  return config.hasOwnProperty('facebookAutoInitEnabled') ? config.facebookAutoInitEnabled : null;
}

export function getFacebookAutoLogAppEvents(config: ExpoConfig) {
  return config.hasOwnProperty('facebookAutoLogAppEventsEnabled')
    ? config.facebookAutoLogAppEventsEnabled
    : null;
}

export function getFacebookAdvertiserIDCollection(config: ExpoConfig) {
  return config.hasOwnProperty('facebookAdvertiserIDCollectionEnabled')
    ? config.facebookAdvertiserIDCollectionEnabled
    : null;
}

/**
 * Setters
 */

export function setFacebookConfig(config: ExpoConfig, infoPlist: InfoPlist) {
  infoPlist = setFacebookAppId(config, infoPlist);
  infoPlist = setFacebookApplicationQuerySchemes(config, infoPlist);
  infoPlist = setFacebookDisplayName(config, infoPlist);
  infoPlist = setFacebookAutoInitEnabled(config, infoPlist);
  infoPlist = setFacebookAutoLogAppEventsEnabled(config, infoPlist);
  infoPlist = setFacebookAdvertiserIDCollectionEnabled(config, infoPlist);
  infoPlist = setFacebookScheme(config, infoPlist);
  return infoPlist;
}

export function setFacebookScheme(config: ExpoConfig, infoPlist: InfoPlist) {
  let facebookScheme = getFacebookScheme(config);
  return appendScheme(facebookScheme, infoPlist);
}

export function setFacebookAutoInitEnabled(config: ExpoConfig, infoPlist: InfoPlist) {
  let facebookAutoInitEnabled = getFacebookAutoInitEnabled(config);

  if (facebookAutoInitEnabled === null) {
    return infoPlist;
  }

  return {
    ...infoPlist,
    FacebookAutoInitEnabled: facebookAutoInitEnabled,
  };
}

export function setFacebookAutoLogAppEventsEnabled(config: ExpoConfig, infoPlist: InfoPlist) {
  let facebookAutoLogAppEventsEnabled = getFacebookAutoLogAppEvents(config);

  if (facebookAutoLogAppEventsEnabled === null) {
    return infoPlist;
  }

  return {
    ...infoPlist,
    FacebookAutoLogAppEventsEnabled: facebookAutoLogAppEventsEnabled,
  };
}

export function setFacebookAdvertiserIDCollectionEnabled(config: ExpoConfig, infoPlist: InfoPlist) {
  let facebookAdvertiserIDCollectionEnabled = getFacebookAdvertiserIDCollection(config);

  if (facebookAdvertiserIDCollectionEnabled === null) {
    return infoPlist;
  }

  return {
    ...infoPlist,
    FacebookAdvertiserIDCollectionEnabled: facebookAdvertiserIDCollectionEnabled,
  };
}

export function setFacebookAppId(config: ExpoConfig, infoPlist: InfoPlist) {
  let facebookAppId = getFacebookAppId(config);
  if (facebookAppId) {
    return {
      ...infoPlist,
      FacebookAppID: facebookAppId,
    };
  }

  return infoPlist;
}

export function setFacebookDisplayName(config: ExpoConfig, infoPlist: InfoPlist) {
  let facebookDisplayName = getFacebookDisplayName(config);

  if (facebookDisplayName) {
    return {
      ...infoPlist,
      FacebookDisplayName: facebookDisplayName,
    };
  }

  return infoPlist;
}

export function setFacebookApplicationQuerySchemes(config: ExpoConfig, infoPlist: InfoPlist) {
  let facebookAppId = getFacebookAppId(config);

  if (!facebookAppId) {
    return infoPlist;
  }

  let existingSchemes = infoPlist.LSApplicationQueriesSchemes || [];

  // already inlcuded, no need to add again
  if (existingSchemes.includes('fbapi')) {
    return infoPlist;
  }

  let updatedSchemes = [
    ...existingSchemes,
    'fbapi',
    'fb-messenger-api',
    'fbauth2',
    'fbshareextension',
  ];

  return {
    ...infoPlist,
    LSApplicationQueriesSchemes: updatedSchemes,
  };
}
