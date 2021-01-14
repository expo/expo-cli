import fs from 'fs-extra';

import { SplashScreenImageResizeMode, SplashScreenImageResizeModeType } from '../constants';
import StateManager from '../utils/StateManager';
import { insert, replace } from '../utils/string-utils';
import { getMainActivityAsync } from './Paths';

/**
 * Injects specific code to MainActivity that would trigger SplashScreen mounting process.
 */
export default async function configureMainActivity(
  projectRootPath: string,
  config: {
    imageResizeMode?: SplashScreenImageResizeModeType;
    statusBar?: {
      translucent?: boolean;
    };
  } = {}
) {
  const resizeMode = config.imageResizeMode ?? SplashScreenImageResizeMode.CONTAIN;
  const statusBarTranslucent: boolean = config.statusBar?.translucent ?? false;

  // eslint-disable-next-line
  const mainActivity = await getMainActivityAsync(projectRootPath);

  if (!mainActivity) {
    throw new Error(`Failed to configure 'MainActivity'.`);
  }

  const isJava = mainActivity.language === 'java';
  const isKotlin = mainActivity.language === 'kt';

  const LE = isJava ? ';' : '';

  const { state: newFileContent } = new StateManager<string, boolean>(mainActivity.contents)
    // importing ReactRootView
    .applyAction(content => {
      const [succeeded, newContent] = replace(content, {
        replacePattern: /^import com\.facebook\.react\.ReactRootView.*?$/m,
        replaceContent: `import com.facebook.react.ReactRootView${LE}`,
      });
      return [newContent, 'replacedReactRootViewImports', succeeded];
    })
    .applyAction((content, { replacedReactRootViewImports }) => {
      if (replacedReactRootViewImports) {
        return [content, 'insertedReactRootViewImports', false];
      }
      const [succeeded, newContent] = insert(content, {
        insertPattern: isJava ? /(?=public class .* extends .* {.*$)/m : /(?=class .* : .* {.*$)/m,
        insertContent: `import com.facebook.react.ReactRootView${LE}

`,
      });

      return [newContent, 'insertedReactRootViewImports', succeeded];
    })
    // importing SplashScreen
    .applyAction(content => {
      const [succeeded, newContent] = replace(content, {
        replacePattern: /^import expo\.modules\.splashscreen\..*?SplashScreen.*?\nimport expo\.modules\.splashscreen\.SplashScreenImageResizeMode.*?$/m,
        replaceContent: `import expo.modules.splashscreen.singletons.SplashScreen${LE}
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
        insertContent: `import expo.modules.splashscreen.singletons.SplashScreen${LE}
import expo.modules.splashscreen.SplashScreenImageResizeMode${LE}

`,
      });
      return [newContent, 'insertedSplashImports', succeeded];
    })
    // registering SplashScreen in onCreate()
    .applyAction(content => {
      const [succeeded, newContent] = replace(content, {
        replacePattern: /(?<=super\.onCreate(.|\n)*?)SplashScreen\.show\(this, SplashScreenImageResizeMode\..*\).*$/m,
        replaceContent: `SplashScreen.show(this, SplashScreenImageResizeMode.${resizeMode.toUpperCase()}, ReactRootView${
          isKotlin ? '::class.java' : '.class'
        }, ${statusBarTranslucent})${LE}`,
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
    // Below line is handled by '@expo/configure-splash-screen' command and it's discouraged to modify it manually
    SplashScreen.show(this, SplashScreenImageResizeMode.${resizeMode.toUpperCase()}, ReactRootView${
          isKotlin ? '::class.java' : '.class'
        }, ${statusBarTranslucent})${LE}`,
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
    // Below line is handled by '@expo/configure-splash-screen' command and it's discouraged to modify it manually
    SplashScreen.show(this, SplashScreenImageResizeMode.${resizeMode.toUpperCase()}, ReactRootView${
          isKotlin ? '::class.java' : '.class'
        }, ${statusBarTranslucent})${LE}
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

  await fs.writeFile(mainActivity.path, newFileContent);
}
