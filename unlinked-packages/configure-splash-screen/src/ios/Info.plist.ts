import fs from 'fs-extra';
import path from 'path';

import { SplashScreenStatusBarStyleType } from '../constants';
import StateManager from '../utils/StateManager';
import { replace, insert } from '../utils/string-utils';

const INFO_PLIST_FILE_PATH = 'Info.plist';

function getUIStatusBarStyle(statusBarStyle: SplashScreenStatusBarStyleType) {
  return `UIStatusBarStyle${statusBarStyle
    .replace(/(^\w)|(-\w)/g, s => s.toUpperCase())
    .replace(/-/g, '')}`;
}

/**
 * Configures [INFO_PLIST] to show [STORYBOARD] filename as Splash/Launch Screen.
 */
export default async function configureInfoPlist(
  iosProjectPath: string,
  config: {
    statusBar?: {
      hidden?: boolean;
      style?: SplashScreenStatusBarStyleType;
    };
  } = {}
) {
  const statusBarHidden: boolean | undefined = config.statusBar?.hidden;
  const statusBarStyle: SplashScreenStatusBarStyleType | undefined = config.statusBar?.style;

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
      if (statusBarHidden === undefined) {
        const [succeeded, newContent] = replace(content, {
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
      const [succeeded, newContent] = replace(content, {
        replaceContent: String(statusBarHidden),
        replacePattern: /(?<=<key>UIStatusBarHidden<\/key>(.|\n)*?<).*(?=\/>)/m,
      });
      return [newContent, 'statusBarHidingReplaced', succeeded];
    })
    .applyAction((content, { statusBarHidingReplaced }) => {
      if (statusBarHidingReplaced || statusBarHidden === undefined) {
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
      if (statusBarStyle === undefined) {
        const [succeeded, newContent] = replace(content, {
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
      const [succeeded, newContent] = replace(content, {
        replaceContent: getUIStatusBarStyle(statusBarStyle),
        replacePattern: /(?<=<key>UIStatusBarStyle<\/key>(.|\n)*?<string>).*(?=<\/string>)/m,
      });
      return [newContent, 'statusBarStyleReplaced', succeeded];
    })
    .applyAction((content, { statusBarStyleReplaced }) => {
      if (statusBarStyleReplaced || statusBarStyle === undefined) {
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
