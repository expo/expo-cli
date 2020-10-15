'use strict';
var __importDefault =
  (this && this.__importDefault) ||
  function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
const fs_extra_1 = __importDefault(require('fs-extra'));
const path_1 = __importDefault(require('path'));

const StateManager_1 = __importDefault(require('../utils/StateManager'));
const string_utils_1 = require('../utils/string-utils');
const INFO_PLIST_FILE_PATH = 'Info.plist';
function getUIStatusBarStyle(statusBarStyle) {
  return `UIStatusBarStyle${statusBarStyle
    .replace(/(^\w)|(-\w)/g, s => s.toUpperCase())
    .replace(/-/g, '')}`;
}
/**
 * Configures [INFO_PLIST] to show [STORYBOARD] filename as Splash/Launch Screen.
 */
async function configureInfoPlist(iosProjectPath, config = {}) {
  var _a, _b;
  const statusBarHidden = (_a = config.statusBar) === null || _a === void 0 ? void 0 : _a.hidden;
  const statusBarStyle = (_b = config.statusBar) === null || _b === void 0 ? void 0 : _b.style;
  const filePath = path_1.default.resolve(iosProjectPath, INFO_PLIST_FILE_PATH);
  const fileContent = await fs_extra_1.default.readFile(filePath, 'utf-8');
  const { state: newContent } = new StateManager_1.default(fileContent)
    // LaunchScreen
    .applyAction(content => {
      const [succeeded, newContent] = string_utils_1.replace(content, {
        replaceContent: '<string>SplashScreen</string>',
        replacePattern: /(?<=<key>UILaunchStoryboardName<\/key>(.|\n)*?)<string>.*?<\/string>/m,
      });
      return [newContent, 'launchScreenReplaced', succeeded];
    })
    .applyAction((content, { launchScreenReplaced }) => {
      if (launchScreenReplaced) {
        return [content, 'launchScreenInserted', false];
      }
      const [succeeded, newContent] = string_utils_1.insert(
        content,
        {
          insertContent: `  <key>UILaunchStoryboardName</key>\n  <string>SplashScreen</string>\n`,
          insertPattern: /<\/dict>/gm,
        },
        true
      );
      return [newContent, 'inserted', succeeded];
    })
    // StatusBar hiding
    .applyAction(content => {
      if (statusBarHidden === undefined) {
        const [succeeded, newContent] = string_utils_1.replace(content, {
          replaceContent: '',
          replacePattern: /^.*<key>UIStatusBarHidden<\/key>(.|\n)*?<.*\/>.*$/m,
        });
        return [newContent, 'statusBarHidingRemoved', succeeded];
      }
      return [content, 'statusBarHidingRemoved', false];
    })
    .applyAction((content, { statusBarHidingRemoved }) => {
      if (statusBarHidingRemoved || statusBarHidden === undefined) {
        return [content, 'statusBarHidingReplaced', false];
      }
      const [succeeded, newContent] = string_utils_1.replace(content, {
        replaceContent: String(statusBarHidden),
        replacePattern: /(?<=<key>UIStatusBarHidden<\/key>(.|\n)*?<).*(?=\/>)/m,
      });
      return [newContent, 'statusBarHidingReplaced', succeeded];
    })
    .applyAction((content, { statusBarHidingReplaced }) => {
      if (statusBarHidingReplaced || statusBarHidden === undefined) {
        return [content, 'statusBarHidingInserted', false];
      }
      const [succeeded, newContent] = string_utils_1.insert(
        content,
        {
          insertContent: `  <key>UIStatusBarHidden</key>\n  <${statusBarHidden}/>\n`,
          insertPattern: /<\/dict>/gm,
        },
        true
      );
      return [newContent, 'statusBarHidingInserted', succeeded];
    })
    // StatusBar style
    .applyAction(content => {
      if (statusBarStyle === undefined) {
        const [succeeded, newContent] = string_utils_1.replace(content, {
          replacePattern: /^.*<key>UIStatusBarStyle<\/key>(.|\n)*?<string>.*<\/string>.*$/m,
          replaceContent: '',
        });
        return [newContent, 'statusBarStyleRemoved', succeeded];
      }
      return [content, 'statusBarStyleRemoved', false];
    })
    .applyAction((content, { statusBarStyleRemoved }) => {
      if (statusBarStyleRemoved || statusBarStyle === undefined) {
        return [content, 'statusBarStyleReplaced', false];
      }
      const [succeeded, newContent] = string_utils_1.replace(content, {
        replaceContent: getUIStatusBarStyle(statusBarStyle),
        replacePattern: /(?<=<key>UIStatusBarStyle<\/key>(.|\n)*?<string>).*(?=<\/string>)/m,
      });
      return [newContent, 'statusBarStyleReplaced', succeeded];
    })
    .applyAction((content, { statusBarStyleReplaced }) => {
      if (statusBarStyleReplaced || statusBarStyle === undefined) {
        return [content, 'statusBarStyleInserted', false];
      }
      const [succeeded, newContent] = string_utils_1.insert(
        content,
        {
          insertContent: `  <key>UIStatusBarStyle</key>\n  <string>${getUIStatusBarStyle(
            statusBarStyle
          )}</string>\n`,
          insertPattern: /<\/dict>/gm,
        },
        true
      );
      return [newContent, 'statusBarStyleInserted', succeeded];
    });
  await fs_extra_1.default.writeFile(filePath, newContent);
}
exports.default = configureInfoPlist;
//# sourceMappingURL=Info.plist.js.map
