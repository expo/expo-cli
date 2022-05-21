import { BaseMods, ConfigPlugin, Mod, withMod } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';
import { Parser } from 'xml2js';

import {
  createTemplateSplashScreenAsync,
  IBSplashScreenDocument,
  toString,
} from './InterfaceBuilder';

export const STORYBOARD_FILE_PATH = './SplashScreen.storyboard';

const STORYBOARD_MOD_NAME = 'splashScreenStoryboard';

/**
 * Provides the SplashScreen `.storyboard` xml data for modification.
 *
 * @param config
 * @param action
 */
export const withIosSplashScreenStoryboard: ConfigPlugin<Mod<IBSplashScreenDocument>> = (
  config,
  action
) => {
  return withMod(config, {
    platform: 'ios',
    mod: STORYBOARD_MOD_NAME,
    action,
  });
};

/** Append a custom rule to supply SplashScreen `.storyboard` xml data to mods on `mods.ios.splashScreenStoryboard` */
export const withIosSplashScreenStoryboardBaseMod: ConfigPlugin = config => {
  return BaseMods.withGeneratedBaseMods(config, {
    platform: 'ios',
    saveToInternal: true,
    skipEmptyMod: false,
    providers: {
      // Append a custom rule to supply .storyboard xml data to mods on `mods.ios.splashScreenStoryboard`
      [STORYBOARD_MOD_NAME]: BaseMods.provider<IBSplashScreenDocument>({
        isIntrospective: true,
        async getFilePath({ modRequest }) {
          //: [root]/myapp/ios/MyApp/SplashScreen.storyboard
          return path.join(
            //: myapp/ios
            modRequest.platformProjectRoot,
            // ./MyApp
            modRequest.projectName!,
            // ./SplashScreen.storyboard
            STORYBOARD_FILE_PATH
          );
        },
        async read(filePath) {
          try {
            const contents = await fs.promises.readFile(filePath, 'utf8');
            const xml = await new Parser().parseStringPromise(contents);
            return xml;
          } catch (error) {
            return createTemplateSplashScreenAsync();
          }
        },
        async write(filePath, { modResults, modRequest: { introspect } }) {
          if (introspect) {
            return;
          }
          await fs.promises.writeFile(filePath, toString(modResults));
        },
      }),
    },
  });
};
