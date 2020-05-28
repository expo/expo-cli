import fs from 'fs-extra';
import path from 'path';

import StateManager from '../StateManager';
import { replace, insert } from '../string-helpers';
import { StatusBarOptions, StatusBarStyle } from '../constants';

const INFO_PLIST_FILE_PATH = 'Info.plist';

function getUIStatusBarStyle(statusBarStyle: StatusBarStyle) {
  return `UIStatusBarStyle${statusBarStyle
    .replace(/(^\w)|(-\w)/g, s => s.toUpperCase())
    .replace(/-/g, '')}`;
}

/**
 * Configures [INFO_PLIST] to show [STORYBOARD] filename as Splash/Launch Screen.
 */
export default async function configureInfoPlist(
  iosProjectPath: string,
  { statusBarHidden, statusBarStyle }: StatusBarOptions
) {
  const filePath = path.resolve(iosProjectPath, INFO_PLIST_FILE_PATH);
  const fileContent = await fs.readFile(filePath, 'utf-8');
  const { state: newContent } = new StateManager<string, boolean>(fileContent)
    // LaunchScreen
    .applyAction(content => {
      const [succeeded, newContent] = replace(content, {
        replaceContent: '<string>SplashScreen</string>',
        replacePattern: /(?<=<key>UILaunchStoryboardName<\/key>(.|\n)*?)<string>.*?<\/string>/m,
      });
      return [newContent, 'launchScreenReplaced', succeeded];
    })
    .applyAction((content, { launchScreenReplaced }) => {
      if (launchScreenReplaced) {
        return [content, 'launchScreenInserted', false];
      }
      const [succeeded, newContent] = insert(
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
      const [succeeded, newContent] = replace(content, {
        replaceContent: String(statusBarHidden),
        replacePattern: /(?<=<key>UIStatusBarHidden<\/key>(.|\n)*?<).*(?=\/>)/m,
      });
      return [newContent, 'statusBarHidingReplaced', succeeded];
    })
    .applyAction((content, { statusBarHidingReplaced }) => {
      if (statusBarHidingReplaced) {
        return [content, 'statusBarHidingInserted', false];
      }
      const [succeeded, newContent] = insert(
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
      const [succeeded, newContent] = replace(content, {
        replaceContent: getUIStatusBarStyle(statusBarStyle),
        replacePattern: /(?<=<key>UIStatusBarStyle<\/key>(.|\n)*?<string>).*(?=<\/string>)/m,
      });
      return [newContent, 'statusBarStyleReplaced', succeeded];
    })
    .applyAction((content, { statusBarStyleReplaced }) => {
      if (statusBarStyleReplaced) {
        return [content, 'statusBarStyleInserted', false];
      }
      const [succeeded, newContent] = insert(
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
  await fs.writeFile(filePath, newContent);
}
