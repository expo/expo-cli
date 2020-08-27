import { ExpoConfig } from '../Config.types';
import { InfoPlist } from './IosConfig.types';

export function getOrientation(config: ExpoConfig) {
  if (config.orientation) {
    return config.orientation;
  }

  return null;
}

export const PORTRAIT_ORIENTATIONS = [
  'UIInterfaceOrientationPortrait',
  'UIInterfaceOrientationPortraitUpsideDown',
];

export const LANDSCAPE_ORIENTATIONS = [
  'UIInterfaceOrientationLandscapeLeft',
  'UIInterfaceOrientationLandscapeRight',
];

function getUISupportedInterfaceOrientations(orientation: string | null) {
  if (orientation === 'portrait') {
    return PORTRAIT_ORIENTATIONS;
  } else if (orientation === 'landscape') {
    return LANDSCAPE_ORIENTATIONS;
  } else {
    return [...PORTRAIT_ORIENTATIONS, ...LANDSCAPE_ORIENTATIONS];
  }
}

export function setOrientation(config: ExpoConfig, infoPlist: InfoPlist) {
  const orientation = getOrientation(config);

  return {
    ...infoPlist,
    UISupportedInterfaceOrientations: getUISupportedInterfaceOrientations(orientation),
  };
}
