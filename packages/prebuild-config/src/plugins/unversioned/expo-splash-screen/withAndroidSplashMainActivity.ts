import { AndroidConfig, ConfigPlugin, withMainActivity } from '@expo/config-plugins';
import { mergeContents } from '@expo/config-plugins/build/utils/generateCode';
import { ExpoConfig } from '@expo/config-types';

import { getAndroidSplashConfig } from './getSplashConfig';

export const withAndroidSplashMainActivity: ConfigPlugin = config => {
  return withMainActivity(config, config => {
    config.modResults.contents = setSplashScreenMainActivity(
      config,
      config.modResults.contents,
      config.modResults.language
    );
    return config;
  });
};

export function setSplashScreenMainActivity(
  config: Pick<ExpoConfig, 'android' | 'androidStatusBar' | 'userInterfaceStyle'>,
  mainActivity: string,
  language: 'java' | 'kt'
): string {
  const splashConfig = getAndroidSplashConfig(config);
  // TODO: Translucent is weird
  const statusBarTranslucent = !!config.androidStatusBar?.translucent;
  if (!splashConfig) {
    // TODO: Remove splash screen code.
    return mainActivity;
  }

  const { resizeMode } = splashConfig;
  const isJava = language === 'java';
  const LE = isJava ? ';' : '';

  mainActivity = AndroidConfig.UserInterfaceStyle.addJavaImports(
    mainActivity,
    [
      'expo.modules.splashscreen.SplashScreen',
      'expo.modules.splashscreen.SplashScreenImageResizeMode',
      'android.os.Bundle',
    ],
    isJava
  );

  if (!mainActivity.match(/(?<=^.*super\.onCreate.*$)/m)) {
    const onCreateBlock = isJava
      ? [
          '    @Override',
          '    protected void onCreate(Bundle savedInstanceState) {',
          '      super.onCreate(savedInstanceState);',
          '    }',
        ]
      : [
          '    override fun onCreate(savedInstanceState: Bundle?) {',
          '      super.onCreate(savedInstanceState)',
          '    }',
        ];

    mainActivity = mergeContents({
      src: mainActivity,
      // insert just below super.onCreate
      anchor: isJava ? /(?<=public class .* extends .* {.*$)/m : /(?<=class .* : .* {.*$)/m,
      offset: 1,
      comment: '//',
      tag: 'expo-splash-screen-mainActivity-onCreate',
      newSrc: onCreateBlock.join('\n'),
    }).contents;
  }

  mainActivity = mergeContents({
    src: mainActivity,
    // insert just below super.onCreate
    anchor: /(?<=^.*super\.onCreate.*$)/m,
    offset: 1,
    comment: '//',
    tag: 'expo-splash-screen-mainActivity-onCreate-show-splash',
    newSrc: `          SplashScreen.show(this, SplashScreenImageResizeMode.${resizeMode.toUpperCase()}, ${statusBarTranslucent})${LE}`,
  }).contents;

  // TODO: Remove old `SplashScreen.show`

  return mainActivity;
}
