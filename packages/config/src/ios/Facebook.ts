import { ConfigPlugin, ExpoConfig } from '../Config.types';
import { withInfoPlist } from '../plugins/withPlist';
import { InfoPlist } from './IosConfig.types';
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

export const withFacebook: ConfigPlugin = config => withInfoPlist(config, setFacebookConfig);

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
  const facebookScheme = getFacebookScheme(config);
  return appendScheme(facebookScheme, infoPlist);
}

export function setFacebookAutoInitEnabled(
  config: ExpoConfig,
  { FacebookAutoInitEnabled, ...infoPlist }: InfoPlist
) {
  const facebookAutoInitEnabled = getFacebookAutoInitEnabled(config);

  if (facebookAutoInitEnabled === null) {
    return infoPlist;
  }

  return {
    ...infoPlist,
    FacebookAutoInitEnabled: facebookAutoInitEnabled,
  };
}

export function setFacebookAutoLogAppEventsEnabled(
  config: ExpoConfig,
  { FacebookAutoLogAppEventsEnabled, ...infoPlist }: InfoPlist
) {
  const facebookAutoLogAppEventsEnabled = getFacebookAutoLogAppEvents(config);

  if (facebookAutoLogAppEventsEnabled === null) {
    return infoPlist;
  }

  return {
    ...infoPlist,
    FacebookAutoLogAppEventsEnabled: facebookAutoLogAppEventsEnabled,
  };
}

export function setFacebookAdvertiserIDCollectionEnabled(
  config: ExpoConfig,
  { FacebookAdvertiserIDCollectionEnabled, ...infoPlist }: InfoPlist
) {
  const facebookAdvertiserIDCollectionEnabled = getFacebookAdvertiserIDCollection(config);

  if (facebookAdvertiserIDCollectionEnabled === null) {
    return infoPlist;
  }

  return {
    ...infoPlist,
    FacebookAdvertiserIDCollectionEnabled: facebookAdvertiserIDCollectionEnabled,
  };
}

export function setFacebookAppId(config: ExpoConfig, { FacebookAppID, ...infoPlist }: InfoPlist) {
  const facebookAppId = getFacebookAppId(config);
  if (facebookAppId) {
    return {
      ...infoPlist,
      FacebookAppID: facebookAppId,
    };
  }

  return infoPlist;
}

export function setFacebookDisplayName(
  config: ExpoConfig,
  { FacebookDisplayName, ...infoPlist }: InfoPlist
) {
  const facebookDisplayName = getFacebookDisplayName(config);

  if (facebookDisplayName) {
    return {
      ...infoPlist,
      FacebookDisplayName: facebookDisplayName,
    };
  }

  return infoPlist;
}

const fbSchemes = ['fbapi', 'fb-messenger-api', 'fbauth2', 'fbshareextension'];

export function setFacebookApplicationQuerySchemes(
  config: ExpoConfig,
  infoPlist: InfoPlist
): InfoPlist {
  const facebookAppId = getFacebookAppId(config);

  const existingSchemes = infoPlist.LSApplicationQueriesSchemes || [];

  if (facebookAppId && existingSchemes.includes('fbapi')) {
    // already inlcuded, no need to add again
    return infoPlist;
  } else if (!facebookAppId && !existingSchemes.length) {
    // already removed, no need to strip again
    const { LSApplicationQueriesSchemes, ...restInfoPlist } = infoPlist;
    if (LSApplicationQueriesSchemes?.length) {
      return infoPlist;
    } else {
      // Return without the empty LSApplicationQueriesSchemes array.
      return restInfoPlist;
    }
  }

  // Remove all schemes
  for (const scheme of fbSchemes) {
    const index = existingSchemes.findIndex(s => s === scheme);
    if (index > -1) {
      existingSchemes.splice(index, 1);
    }
  }

  if (!facebookAppId) {
    // Run again to ensure the LSApplicationQueriesSchemes array is stripped if needed.
    infoPlist.LSApplicationQueriesSchemes = existingSchemes;
    if (!infoPlist.LSApplicationQueriesSchemes.length) {
      delete infoPlist.LSApplicationQueriesSchemes;
    }
    return infoPlist;
  }

  // TODO: it's actually necessary to add more query schemes (specific to the
  // app) to support all of the features that the Facebook SDK provides, should
  // we sync those here too?
  const updatedSchemes = [...existingSchemes, ...fbSchemes];

  return {
    ...infoPlist,
    LSApplicationQueriesSchemes: updatedSchemes,
  };
}
