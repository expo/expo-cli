'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const cli_platform_android_1 = require('@react-native-community/cli-platform-android');
const fs_extra_1 = __importDefault(require('fs-extra'));
const path_1 = __importDefault(require('path'));

const constants_1 = require('../constants');
const StateManager_1 = __importDefault(require('../utils/StateManager'));
const string_utils_1 = require('../utils/string-utils');
/**
 * Injects specific code to MainActivity that would trigger SplashScreen mounting process.
 */
async function configureMainActivity(projectRootPath, config = {}) {
  var _a, _b, _c, _d;
  const resizeMode =
    (_a = config.imageResizeMode) !== null && _a !== void 0
      ? _a
      : constants_1.SplashScreenImageResizeMode.CONTAIN;
  const statusBarTranslucent =
    (_c = (_b = config.statusBar) === null || _b === void 0 ? void 0 : _b.translucent) !== null &&
    _c !== void 0
      ? _c
      : false;
  // eslint-disable-next-line
  const mainApplicationPath =
    (_d = cli_platform_android_1.projectConfig(projectRootPath)) === null || _d === void 0
      ? void 0
      : _d.mainFilePath;
  if (!mainApplicationPath) {
    throw new Error(`Failed to configure 'MainActivity'.`);
  }
  const mainActivityPathJava = path_1.default.resolve(mainApplicationPath, '../MainActivity.java');
  const mainActivityPathKotlin = path_1.default.resolve(mainApplicationPath, '../MainActivity.kt');
  const isJava = await fs_extra_1.default.pathExists(mainActivityPathJava);
  const isKotlin = !isJava && (await fs_extra_1.default.pathExists(mainActivityPathKotlin));
  if (!isJava && !isKotlin) {
    throw new Error(`Failed to find 'MainActivity' file.`);
  }
  const LE = isJava ? ';' : '';
  const fileContent = await fs_extra_1.default.readFile(
    isJava ? mainActivityPathJava : mainActivityPathKotlin,
    'utf-8'
  );
  const { state: newFileContent } = new StateManager_1.default(fileContent)
    // importing ReactRootView
    .applyAction(content => {
      const [succeeded, newContent] = string_utils_1.replace(content, {
        replacePattern: /^import com\.facebook\.react\.ReactRootView.*?$/m,
        replaceContent: `import com.facebook.react.ReactRootView${LE}`,
      });
      return [newContent, 'replacedReactRootViewImports', succeeded];
    })
    .applyAction((content, { replacedReactRootViewImports }) => {
      if (replacedReactRootViewImports) {
        return [content, 'insertedReactRootViewImports', false];
      }
      const [succeeded, newContent] = string_utils_1.insert(content, {
        insertPattern: isJava ? /(?=public class .* extends .* {.*$)/m : /(?=class .* : .* {.*$)/m,
        insertContent: `import com.facebook.react.ReactRootView${LE}

`,
      });
      return [newContent, 'insertedReactRootViewImports', succeeded];
    })
    // importing SplashScreen
    .applyAction(content => {
      const [succeeded, newContent] = string_utils_1.replace(content, {
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
      const [succeeded, newContent] = string_utils_1.insert(content, {
        insertPattern: isJava ? /(?=public class .* extends .* {.*$)/m : /(?=class .* : .* {.*$)/m,
        insertContent: `import expo.modules.splashscreen.singletons.SplashScreen${LE}
import expo.modules.splashscreen.SplashScreenImageResizeMode${LE}

`,
      });
      return [newContent, 'insertedSplashImports', succeeded];
    })
    // registering SplashScreen in onCreate()
    .applyAction(content => {
      const [succeeded, newContent] = string_utils_1.replace(content, {
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
      const [succeeded, newContent] = string_utils_1.insert(content, {
        insertPattern: /(?<=^.*super\.onCreate.*$)/m,
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
      const [succeeded, newContent] = string_utils_1.insert(content, {
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
      const [succeeded, newContent] = string_utils_1.replace(content, {
        replacePattern: /import android\.os\.Bundle/m,
        replaceContent: 'import android.os.Bundle',
      });
      return [newContent, 'replacedBundleImport', succeeded];
    })
    .applyAction((content, { replacedInOnCreate, insertedInOnCreate }) => {
      if (replacedInOnCreate || insertedInOnCreate) {
        return [content, 'insertedBundleImport', false];
      }
      const [succeeded, newContent] = string_utils_1.insert(content, {
        insertPattern: /(?<=(^.*?package .*?$))/m,
        insertContent: `\n\nimport android.os.Bundle${LE}`,
      });
      return [newContent, 'insertedBundleImport', succeeded];
    });
  await fs_extra_1.default.writeFile(
    isJava ? mainActivityPathJava : mainActivityPathKotlin,
    newFileContent
  );
}
exports.default = configureMainActivity;
//# sourceMappingURL=MainActivity.js.map
