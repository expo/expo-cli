import {
  AndroidConfig,
  ConfigPlugin,
  WarningAggregator,
  withAndroidColors,
  withAndroidStyles,
} from '@expo/config-plugins';
import { ExpoConfig } from '@expo/config-types';

const NAVIGATION_BAR_COLOR = 'navigationBarColor';

export const withNavigationBar: ConfigPlugin = config => {
  const immersiveMode = getNavigationBarImmersiveMode(config);
  if (immersiveMode) {
    // Immersive mode needs to be set programmatically
    // TODO: Resolve
    WarningAggregator.addWarningAndroid(
      'androidNavigationBar.visible',
      // Versioning is important because the functionality depends on the MainActivity delegate, introduced in the SDK +43 template.
      'Install expo-navigation-bar, and ensure your project is using Expo SDK +43 to enable this functionality.',
      'https://developer.android.com/training/system-ui/immersive'
    );
  }

  config = withNavigationBarColors(config);
  config = withNavigationBarStyles(config);
  return config;
};

const withNavigationBarColors: ConfigPlugin = config => {
  return withAndroidColors(config, config => {
    config.modResults = setNavigationBarColors(config, config.modResults);
    return config;
  });
};

const withNavigationBarStyles: ConfigPlugin = config => {
  return withAndroidStyles(config, config => {
    config.modResults = setNavigationBarStyles(config, config.modResults);
    return config;
  });
};

export function setNavigationBarColors(
  config: Pick<ExpoConfig, 'androidNavigationBar'>,
  colors: AndroidConfig.Resources.ResourceXML
): AndroidConfig.Resources.ResourceXML {
  const hexString = getNavigationBarColor(config);
  if (hexString) {
    colors = AndroidConfig.Colors.setColorItem(
      AndroidConfig.Resources.buildResourceItem({
        name: NAVIGATION_BAR_COLOR,
        value: hexString,
      }),
      colors
    );
  }
  return colors;
}

export function setNavigationBarStyles(
  config: Pick<ExpoConfig, 'androidNavigationBar'>,
  styles: AndroidConfig.Resources.ResourceXML
): AndroidConfig.Resources.ResourceXML {
  styles = AndroidConfig.Styles.assignStylesValue(styles, {
    add: getNavigationBarStyle(config) === 'dark-content',
    parent: AndroidConfig.Styles.getAppThemeLightNoActionBarGroup(),
    name: 'android:windowLightNavigationBar',
    value: 'true',
  });
  styles = AndroidConfig.Styles.assignStylesValue(styles, {
    add: !!getNavigationBarColor(config),
    parent: AndroidConfig.Styles.getAppThemeLightNoActionBarGroup(),
    name: `android:${NAVIGATION_BAR_COLOR}`,
    value: `@color/${NAVIGATION_BAR_COLOR}`,
  });

  return styles;
}

export function getNavigationBarImmersiveMode(config: Pick<ExpoConfig, 'androidNavigationBar'>) {
  return config.androidNavigationBar?.visible || null;
}

export function getNavigationBarColor(config: Pick<ExpoConfig, 'androidNavigationBar'>) {
  return config.androidNavigationBar?.backgroundColor || null;
}

export function getNavigationBarStyle(config: Pick<ExpoConfig, 'androidNavigationBar'>) {
  return config.androidNavigationBar?.barStyle || 'light-content';
}
