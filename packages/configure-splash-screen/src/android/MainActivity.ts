import { projectConfig } from '@react-native-community/cli-platform-android';
import fs from 'fs-extra';
import path from 'path';

import StateManager from '../StateManager';
import { ResizeMode } from '../constants';
import { insert, replace } from '../string-helpers';

/**
 * Injects specific code to MainActivity that would trigger SplashScreen mounting process.
 */
export default async function configureMainActivity(
  projectRootPath: string,
  resizeMode: ResizeMode,
  statusBarTranslucent: boolean = false
) {
  // eslint-disable-next-line
  const mainApplicationPath = projectConfig(projectRootPath)?.mainFilePath;

  if (!mainApplicationPath) {
    throw new Error(`Failed to configure 'MainActivity'.`);
  }

  const mainActivityPathJava = path.resolve(mainApplicationPath, '../MainActivity.java');
  const mainActivityPathKotlin = path.resolve(mainApplicationPath, '../MainActivity.kt');

  const isJava = await fs.pathExists(mainActivityPathJava);
  const isKotlin = !isJava && (await fs.pathExists(mainActivityPathKotlin));

  if (!isJava && !isKotlin) {
    throw new Error(`Failed to find 'MainActivity' file.`);
  }

  const LE = isJava ? ';' : '';
  const fileContent = await fs.readFile(
    isJava ? mainActivityPathJava : mainActivityPathKotlin,
    'utf-8'
  );
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
    // Below line is handled by '@expo/configure-splash-screen' command and it's discouraged to modify it manually
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
    // Below line is handled by '@expo/configure-splash-screen' command and it's discouraged to modify it manually
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

  await fs.writeFile(isJava ? mainActivityPathJava : mainActivityPathKotlin, newFileContent);
}
