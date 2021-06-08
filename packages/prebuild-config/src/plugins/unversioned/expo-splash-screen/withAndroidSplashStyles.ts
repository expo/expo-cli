import { AndroidConfig, ConfigPlugin, withDangerousMod, XML } from '@expo/config-plugins';
import { Colors } from '@expo/config-plugins/build/android';
import { ExpoConfig } from '@expo/config-types';

import { getAndroidDarkSplashConfig, getAndroidSplashConfig } from './getAndroidSplashConfig';

const { buildResourceItem, readResourcesXMLAsync } = AndroidConfig.Resources;
const styleResourceGroup = {
  name: 'Theme.App.SplashScreen',
  parent: 'AppTheme',
};
const SPLASH_COLOR_NAME = 'splashscreen_background';

export const withAndroidSplashStyles: ConfigPlugin = config => {
  return withDangerousMod(config, [
    'android',
    async config => {
      await setSplashStylesAsync(config, config.modRequest.projectRoot);
      return config;
    },
  ]);
};

export function getSplashBackgroundColor(config: ExpoConfig): string | null {
  return getAndroidSplashConfig(config)?.backgroundColor ?? null;
}

export function getSplashDarkBackgroundColor(config: ExpoConfig): string | null {
  return getAndroidDarkSplashConfig(config)?.backgroundColor ?? null;
}

export async function setSplashStylesAsync(config: ExpoConfig, projectRoot: string) {
  const backgroundColor = getSplashBackgroundColor(config);
  const darkBackgroundColor = getSplashDarkBackgroundColor(config);

  // TODO: Does this need to be themed?
  await setSplashStylesForThemeAsync({
    projectRoot,
    // kind: theme.kind,
  });
  for (const theme of [
    { kind: 'values', color: backgroundColor },
    { kind: 'values-night', color: darkBackgroundColor },
  ]) {
    // TODO: use kind: values-night, values-night-v23, and values-v23
    await setSplashColorsForThemeAsync({
      projectRoot,
      kind: theme.kind as AndroidConfig.Resources.ResourceKind,
      backgroundColor: theme.color,
    });
  }

  return true;
}

export async function setSplashStylesForThemeAsync({
  projectRoot,
  kind,
}: {
  projectRoot: string;
  kind?: AndroidConfig.Resources.ResourceKind;
}): Promise<AndroidConfig.Resources.ResourceXML> {
  const stylesPath = await AndroidConfig.Styles.getProjectStylesXMLPathAsync(projectRoot, { kind });

  let xml = await readResourcesXMLAsync({ path: stylesPath });

  // Add splash screen image
  xml = AndroidConfig.Styles.setStylesItem({
    xml,
    item: buildResourceItem({ name: 'android:windowBackground', value: '@drawable/splashscreen' }),
    parent: styleResourceGroup,
  });

  await XML.writeXMLAsync({ path: stylesPath, xml });

  return xml;
}

export async function setSplashColorsForThemeAsync({
  projectRoot,
  kind,
  backgroundColor,
}: {
  projectRoot: string;
  kind?: AndroidConfig.Resources.ResourceKind;
  backgroundColor?: string | null;
}): Promise<AndroidConfig.Resources.ResourceXML> {
  const colorsPath = await Colors.getProjectColorsXMLPathAsync(projectRoot, { kind });

  let colors = await readResourcesXMLAsync({ path: colorsPath });

  colors = Colors.assignColorValue(colors, { value: backgroundColor, name: SPLASH_COLOR_NAME });

  await XML.writeXMLAsync({ path: colorsPath, xml: colors });

  return colors;
}
