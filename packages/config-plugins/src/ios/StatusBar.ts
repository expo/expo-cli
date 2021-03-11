import { ExpoConfig } from '@expo/config-types';

import { createInfoPlistPlugin } from '../plugins/ios-plugins';
import { InfoPlist } from './IosConfig.types';

type StatusBarStyle = 'auto' | 'light' | 'dark'; // | 'inverted'

interface StatusBarConfig {
  /**
   * Sets the color of the status bar text. Default value is "auto" which
   * picks the appropriate value according to the active color scheme, eg:
   * if your app is dark mode, the style will be "light".
   */
  style?: StatusBarStyle;

  /**
   * If the status bar is hidden.
   */
  hidden?: boolean;

  /**
   * The background color of the status bar.
   *
   * @platform android
   */
  backgroundColor?: string;

  /**
   * If the status bar is translucent. When translucent is set to true,
   * the app will draw under the status bar. This is the default in
   * projects created with Expo tools because it is consistent with iOS.
   *
   * @platform android
   */
  translucent?: boolean;
}

export const withStatusBar = createInfoPlistPlugin(setStatusBar);

function getStatusBarConfig(config: ExpoConfig): StatusBarConfig {
  // TODO: Support status bar config across platforms in the Expo config.
  return {
    style: 'auto',
  };
}

function setStatusBar(config: ExpoConfig, infoPlist: InfoPlist): InfoPlist {
  return setStatusBarInfoPlist(getStatusBarConfig(config), infoPlist);
}

function getUIStatusBarStyle(statusBarStyle: StatusBarStyle): string {
  return `UIStatusBarStyle${statusBarStyle
    .replace(/(^\w)|(-\w)/g, s => s.toUpperCase())
    .replace(/-/g, '')}`;
}

function setStatusBarInfoPlist(
  statusBar: Pick<StatusBarConfig, 'hidden' | 'style'> | null,
  infoPlist: InfoPlist
): InfoPlist {
  if (statusBar?.hidden != null) {
    infoPlist.UIStatusBarHidden = !!statusBar.hidden;
  } else {
    delete infoPlist.UIStatusBarHidden;
  }

  if (statusBar?.style) {
    infoPlist.UIStatusBarStyle = getUIStatusBarStyle(statusBar.style);
  } else {
    delete infoPlist.UIStatusBarStyle;
  }
  return infoPlist;
}
