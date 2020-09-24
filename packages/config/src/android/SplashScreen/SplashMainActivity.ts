import { ExpoConfig } from '../../Config.types';
import { getStatusBarTranslucent } from '../StatusBar';
import StateManager from '../utils/StateManager';
import { insert, replace } from '../utils/string-utils';
import { getSplashConfig } from './SplashConfig';

/**
 * Injects specific code to MainActivity that would trigger SplashScreen mounting process.
 */
export async function setSplashMainActivity(
  config: ExpoConfig,
  fileContent: string,
  language: 'java' | 'kt'
): Promise<string> {
  const splashConfig = getSplashConfig(config);
  const statusBarTranslucent = getStatusBarTranslucent(config) ?? false;
  if (!splashConfig) {
    // TODO: Remove splash screen code.
    return fileContent;
  }

  const resizeMode = splashConfig.resizeMode;
  const isJava = language === 'java';
  const LE = isJava ? ';' : '';

  const { state: newFileContent } = new StateManager<string, boolean>(fileContent)
    // importing SplashScreen
    .applyAction(content => {
      const [succeeded, newContent] = replace(content, {
        replacePattern: /^import expo\.modules\.splashscreen\.SplashScreen.*?\nimport expo\.modules\.splashscreen\.SplashScreenImageResizeMode.*?$/m,
        replaceContent: `import expo.modules.splashscreen.SplashScreen${LE}
import expo.modules.splashscreen.SplashScreenImageResizeMode${LE}`,
      });
      return [newContent, 'replacedSplashImports', succeeded];
    })
    .applyAction((content, { replacedSplashImports }) => {
      if (replacedSplashImports) {
        return [content, 'insertedSplashImports', false];
      }
      const [succeeded, newContent] = insert(content, {
        insertPattern: isJava ? /(?=public class .* extends .* {.*$)/m : /(?=class .* : .* {.*$)/m,
        insertContent: `import expo.modules.splashscreen.SplashScreen${LE}
import expo.modules.splashscreen.SplashScreenImageResizeMode${LE}
  
  `,
      });
      return [newContent, 'insertedSplashImports', succeeded];
    })
    // registering SplashScreen in onCreate()
    .applyAction(content => {
      const [succeeded, newContent] = replace(content, {
        replacePattern: /(?<=super\.onCreate(.|\n)*?)SplashScreen\.show\(this, SplashScreenImageResizeMode\..*\).*$/m,
        replaceContent: `SplashScreen.show(this, SplashScreenImageResizeMode.${resizeMode.toUpperCase()}, ${statusBarTranslucent})${LE}`,
      });
      return [newContent, 'replacedInOnCreate', succeeded];
    })
    .applyAction((content, { replacedInOnCreate }) => {
      if (replacedInOnCreate) {
        return [content, 'insertedInOnCreate', false];
      }
      const [succeeded, newContent] = insert(content, {
        insertPattern: /(?<=^.*super\.onCreate.*$)/m, // insert just below super.onCreate
        insertContent: `
      // SplashScreen.show(...) has to be called after super.onCreate(...)
      // Below line is handled by '@expo/config' command and it's discouraged to modify it manually
      SplashScreen.show(this, SplashScreenImageResizeMode.${resizeMode.toUpperCase()}, ${statusBarTranslucent})${LE}`,
      });
      return [newContent, 'insertedInOnCreate', succeeded];
    })
    // inserting basic onCreate()
    .applyAction((content, { replacedInOnCreate, insertedInOnCreate }) => {
      if (replacedInOnCreate || insertedInOnCreate) {
        return [content, 'insertedOnCreate', false];
      }
      const [succeeded, newContent] = insert(content, {
        insertPattern: isJava
          ? /(?<=public class .* extends .* {.*$)/m
          : /(?<=class .* : .* {.*$)/m,
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
      return [newContent, 'insertedOnCreate', succeeded];
    })
    // importing Bundle
    .applyAction((content, { replacedInOnCreate, insertedInOnCreate }) => {
      if (replacedInOnCreate || insertedInOnCreate) {
        return [content, 'replacedBundleImport', false];
      }
      const [succeeded, newContent] = replace(content, {
        replacePattern: /import android\.os\.Bundle/m,
        replaceContent: 'import android.os.Bundle',
      });
      return [newContent, 'replacedBundleImport', succeeded];
    })
    .applyAction((content, { replacedInOnCreate, insertedInOnCreate }) => {
      if (replacedInOnCreate || insertedInOnCreate) {
        return [content, 'insertedBundleImport', false];
      }
      const [succeeded, newContent] = insert(content, {
        insertPattern: /(?<=(^.*?package .*?$))/m,
        insertContent: `\n\nimport android.os.Bundle${LE}`,
      });
      return [newContent, 'insertedBundleImport', succeeded];
    });

  return newFileContent;
}
