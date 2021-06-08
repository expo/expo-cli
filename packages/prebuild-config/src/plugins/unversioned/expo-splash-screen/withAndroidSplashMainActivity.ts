import { AndroidConfig, ConfigPlugin, withMainActivity } from '@expo/config-plugins';
import { mergeContents, removeContents } from '@expo/config-plugins/build/utils/generateCode';
import { ExpoConfig } from '@expo/config-types';

import { getAndroidSplashConfig } from './getAndroidSplashConfig';

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
  if (!splashConfig) {
    // TODO: Remove splash screen code.
    return mainActivity;
  }
  // TODO: Translucent is weird
  const statusBarTranslucent = !!config.androidStatusBar?.translucent;

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

  // DO NOT CHANGE
  const showSplash = 'expo-splash-screen-mainActivity-onCreate-show-splash';

  // Remove our generated code safely...
  mainActivity = removeContents({
    src: mainActivity,
    tag: showSplash,
  }).contents;

  // Remove code from `@expo/configure-splash-screen`
  mainActivity = mainActivity
    .split('\n')
    .filter(line => {
      return !/SplashScreen\.show\(this,\s?SplashScreenImageResizeMode\./.test(line);
    })
    .join('\n');

  // Reapply generated code.
  mainActivity = mergeContents({
    src: mainActivity,
    // insert just below super.onCreate
    anchor: /(?<=^.*super\.onCreate.*$)/m,
    offset: 1,
    comment: '//',
    tag: showSplash,
    newSrc: `    SplashScreen.show(this, SplashScreenImageResizeMode.${resizeMode.toUpperCase()}, ReactRootView${
      isJava ? '.class' : '::class.java'
    }, ${statusBarTranslucent})${LE}`,
  }).contents;

  // TODO: Remove old `SplashScreen.show`

  return mainActivity;
}
