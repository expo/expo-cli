import { ExpoConfig } from '@expo/config-types';

import { ConfigPlugin } from '../Plugin.types';
import { createAndroidManifestPlugin, withMainActivity } from '../plugins/android-plugins';
import * as WarningAggregator from '../utils/warnings';
import { AndroidManifest, getMainActivityOrThrow } from './Manifest';
import { addImports } from './codeMod';

export const CONFIG_CHANGES_ATTRIBUTE = 'android:configChanges';

export const ON_CONFIGURATION_CHANGED = `
public class MainActivity extends ReactActivity {

    // Added automatically by Expo Config
    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        Intent intent = new Intent("onConfigurationChanged");
        intent.putExtra("newConfig", newConfig);
        sendBroadcast(intent);
    }
`;

export const withUiModeManifest = createAndroidManifestPlugin(
  setUiModeAndroidManifest,
  'withUiModeManifest'
);

export const withUiModeMainActivity: ConfigPlugin = config => {
  return withMainActivity(config, config => {
    if (config.modResults.language === 'java') {
      config.modResults.contents = addOnConfigurationChangedMainActivity(
        config,
        config.modResults.contents
      );
    } else {
      WarningAggregator.addWarningAndroid(
        'android-userInterfaceStyle',
        `Cannot automatically configure MainActivity if it's not java`
      );
    }
    return config;
  });
};

export function getUserInterfaceStyle(
  config: Pick<ExpoConfig, 'android' | 'userInterfaceStyle'>
): string {
  return config.android?.userInterfaceStyle ?? config.userInterfaceStyle ?? 'light';
}

export function setUiModeAndroidManifest(
  config: Pick<ExpoConfig, 'android' | 'userInterfaceStyle'>,
  androidManifest: AndroidManifest
) {
  const userInterfaceStyle = getUserInterfaceStyle(config);
  // TODO: Remove this if we decide to remove any uiMode configuration when not specified
  if (!userInterfaceStyle) {
    return androidManifest;
  }

  const mainActivity = getMainActivityOrThrow(androidManifest);
  mainActivity.$[CONFIG_CHANGES_ATTRIBUTE] =
    'keyboard|keyboardHidden|orientation|screenSize|uiMode';

  return androidManifest;
}

export function addOnConfigurationChangedMainActivity(
  config: Pick<ExpoConfig, 'android' | 'userInterfaceStyle'>,
  mainActivity: string
): string {
  const userInterfaceStyle = getUserInterfaceStyle(config);
  if (!userInterfaceStyle) {
    return mainActivity;
  }

  // Cruzan: this is not ideal, but I'm not sure of a better way to handle writing to MainActivity.java
  if (mainActivity.match(`onConfigurationChanged`)?.length) {
    return mainActivity;
  }

  const MainActivityWithImports = addImports(
    mainActivity,
    ['android.content.Intent', 'android.content.res.Configuration'],
    true
  );

  const pattern = new RegExp(`public class MainActivity extends ReactActivity {`);
  return MainActivityWithImports.replace(pattern, ON_CONFIGURATION_CHANGED);
}
