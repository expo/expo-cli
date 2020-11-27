import { ExpoConfig } from '@expo/config-types';

import { createInfoPlistPlugin } from '../plugins/ios-plugins';
import { InfoPlist, InterfaceOrientation } from './IosConfig.types';

export const withOrientation = createInfoPlistPlugin(setOrientation, 'withOrientation');

export function getOrientation(config: Pick<ExpoConfig, 'orientation'>) {
  return config.orientation ?? null;
}

export const PORTRAIT_ORIENTATIONS: InterfaceOrientation[] = [
  'UIInterfaceOrientationPortrait',
  'UIInterfaceOrientationPortraitUpsideDown',
];

export const LANDSCAPE_ORIENTATIONS: InterfaceOrientation[] = [
  'UIInterfaceOrientationLandscapeLeft',
  'UIInterfaceOrientationLandscapeRight',
];

function getUISupportedInterfaceOrientations(orientation: string | null): InterfaceOrientation[] {
  if (orientation === 'portrait') {
    return PORTRAIT_ORIENTATIONS;
  } else if (orientation === 'landscape') {
    return LANDSCAPE_ORIENTATIONS;
  } else {
    return [...PORTRAIT_ORIENTATIONS, ...LANDSCAPE_ORIENTATIONS];
  }
}

export function setOrientation(
  config: Pick<ExpoConfig, 'orientation'>,
  infoPlist: InfoPlist
): InfoPlist {
  const orientation = getOrientation(config);

  return {
    ...infoPlist,
    UISupportedInterfaceOrientations: getUISupportedInterfaceOrientations(orientation),
  };
}
