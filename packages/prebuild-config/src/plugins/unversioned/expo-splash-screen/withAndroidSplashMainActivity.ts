import { AndroidConfig, ConfigPlugin, withMainActivity } from '@expo/config-plugins';
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

function replace(
  content: string,
  { replaceContent, replacePattern }: { replaceContent: string; replacePattern: string | RegExp }
): [boolean, string] {
  const replacePatternOccurrence = content.search(replacePattern);
  if (replacePatternOccurrence !== -1) {
    return [true, content.replace(replacePattern, replaceContent)];
  }
  return [false, content];
}

/**
 * Inserts content just before first occurrence of provided pattern.
 * @returns [`true`, modifiedContent: string] if insertion is successful, [`false`, originalContent] otherwise.
 */
function insert(
  content: string,
  { insertContent, insertPattern }: { insertContent: string; insertPattern: RegExp | string }
): [boolean, string] {
  const insertPatternOccurrence = content.search(insertPattern);
  if (insertPatternOccurrence !== -1) {
    return [
      true,
      `${content.slice(0, insertPatternOccurrence)}${insertContent}${content.slice(
        insertPatternOccurrence
      )}`,
    ];
  }
  return [false, content];
}

export function setSplashScreenMainActivity(
  config: Pick<ExpoConfig, 'android' | 'androidStatusBar' | 'userInterfaceStyle'>,
  mainActivity: string,
  language: 'java' | 'kt'
): string {
  const splashConfig = getAndroidSplashConfig(config);
  // TODO: Translucent is weird
  const statusBarTranslucent = config.androidStatusBar?.translucent;
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

  const [replacedInOnCreate, newContent] = replace(mainActivity, {
    replacePattern: /(?<=super\.onCreate(.|\n)*?)SplashScreen\.show\(this, SplashScreenImageResizeMode\..*\).*$/m,
    replaceContent: `SplashScreen.show(this, SplashScreenImageResizeMode.${resizeMode.toUpperCase()}, ${statusBarTranslucent})${LE}`,
  });
  mainActivity = newContent;

  if (!replacedInOnCreate) {
    const [insertedInOnCreate, nextContent] = insert(mainActivity, {
      insertPattern: /(?<=^.*super\.onCreate.*$)/m, // insert just below super.onCreate
      insertContent: `
        // SplashScreen.show(...) has to be called after super.onCreate(...)
        // Below line is handled by '@expo/config' command and it's discouraged to modify it manually
        SplashScreen.show(this, SplashScreenImageResizeMode.${resizeMode.toUpperCase()}, ${statusBarTranslucent})${LE}`,
    });
    mainActivity = nextContent;
  } else {
    const [succeeded, newContent] = insert(mainActivity, {
      insertPattern: isJava ? /(?<=public class .* extends .* {.*$)/m : /(?<=class .* : .* {.*$)/m,
      insertContent: `
        ${
          isJava
            ? `@Override
        protected void onCreate(Bundle savedInstanceState`
            : 'override fun onCreate(savedInstanceState: Bundle?'
        }) {
          super.onCreate(savedInstanceState)${LE}
          // SplashScreen.show(...) has to be called after super.onCreate(...)
          // Below line is handled by '@expo/config' command and it's discouraged to modify it manually
          SplashScreen.show(this, SplashScreenImageResizeMode.${resizeMode.toUpperCase()}, ${statusBarTranslucent})${LE}
        }
      `,
    });
    mainActivity = newContent;
  }

  return mainActivity;
}
