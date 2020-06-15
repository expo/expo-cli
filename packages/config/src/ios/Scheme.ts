import { InfoPlist, URLScheme } from './IosConfig.types';
import { ExpoConfig } from '../Config.types';

export function getScheme(config: Pick<ExpoConfig, 'scheme'>): string | null {
  return typeof config.scheme === 'string' ? config.scheme : null;
}

export function setScheme(config: Pick<ExpoConfig, 'scheme'>, infoPlist: InfoPlist): InfoPlist {
  let scheme = getScheme(config);
  if (!scheme) {
    return infoPlist;
  }

  return {
    ...infoPlist,
    CFBundleURLTypes: [{ CFBundleURLSchemes: [scheme] }],
  };
}

// TODO: update this to work well idempotently!
export function appendScheme(scheme: string | null, infoPlist: InfoPlist): InfoPlist {
  if (!scheme) {
    return infoPlist;
  }

  let existingSchemes = infoPlist.CFBundleURLTypes;

  // No need to append if we don't have any
  if (!existingSchemes) {
    return setScheme({ scheme }, infoPlist);
  }

  return {
    ...infoPlist,
    CFBundleURLTypes: [
      ...existingSchemes,
      {
        CFBundleURLSchemes: [scheme],
      },
    ],
  };
}

export function removeScheme(scheme: string | null, infoPlist: InfoPlist): InfoPlist {
  if (!scheme) {
    return infoPlist;
  }

  // No need to remove if we don't have any
  if (!infoPlist.CFBundleURLTypes) {
    return infoPlist;
  }

  infoPlist.CFBundleURLTypes = infoPlist.CFBundleURLTypes.map(bundleUrlType => {
    const index = bundleUrlType.CFBundleURLSchemes.indexOf(scheme);
    if (index > -1) {
      bundleUrlType.CFBundleURLSchemes.splice(index, 1);
      if (bundleUrlType.CFBundleURLSchemes.length === 0) {
        return undefined;
      }
    }
    return bundleUrlType;
  }).filter(Boolean) as URLScheme[];

  return infoPlist;
}

export function hasScheme(scheme: string, infoPlist: InfoPlist): boolean {
  const existingSchemes = infoPlist.CFBundleURLTypes;

  if (!Array.isArray(existingSchemes)) return false;

  return existingSchemes.some(({ CFBundleURLSchemes: schemes }: any) => schemes.includes(scheme));
}

export function getSchemesFromPlist(infoPlist: InfoPlist): string[] {
  if (Array.isArray(infoPlist.CFBundleURLTypes)) {
    return infoPlist.CFBundleURLTypes.reduce<string[]>((schemes, { CFBundleURLSchemes }) => {
      if (Array.isArray(CFBundleURLSchemes)) {
        return [...schemes, ...CFBundleURLSchemes];
      }
      return schemes;
    }, []);
  }
  return [];
}
