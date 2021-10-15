import { ConfigPlugin, withAppDelegate, withDangerousMod } from '@expo/config-plugins';
import {
  getAppDelegateObjcHeaderFilePath,
  getPBXProjectPath,
} from '@expo/config-plugins/build/ios/Paths';
import { getDesignatedSwiftBridgingHeaderFileReference } from '@expo/config-plugins/build/ios/Swift';
import {
  addObjcImports,
  insertContentsInsideObjcFunctionBlock,
  insertContentsInsideSwiftFunctionBlock,
} from '@expo/config-plugins/build/ios/codeMod';
import fs from 'fs-extra';
import { sync as globSync } from 'glob';
import xcode from 'xcode';

export const withIosModulesAppDelegate: ConfigPlugin = config => {
  return withAppDelegate(config, config => {
    config.modResults.contents =
      config.modResults.language === 'objc'
        ? updateModulesAppDelegateObjcImpl(config.modResults.contents)
        : updateModulesAppDelegateSwift(config.modResults.contents);
    return config;
  });
};

export const withIosModulesAppDelegateObjcHeader: ConfigPlugin = config => {
  return withDangerousMod(config, [
    'ios',
    async config => {
      try {
        const appDelegateObjcHeaderPath = getAppDelegateObjcHeaderFilePath(
          config.modRequest.projectRoot
        );
        let contents = await fs.readFile(appDelegateObjcHeaderPath, 'utf8');
        contents = updateModulesAppDelegateObjcHeader(contents);
        await fs.writeFile(appDelegateObjcHeaderPath, contents);
      } catch {}
      return config;
    },
  ]);
};

export const withIosModulesSwiftBridgingHeader: ConfigPlugin = config => {
  return withDangerousMod(config, [
    'ios',
    async config => {
      const { projectRoot } = config.modRequest;
      const projectFilePath = getPBXProjectPath(projectRoot);
      const project = xcode.project(projectFilePath);
      project.parseSync();

      const bridgingHeaderFileName = getDesignatedSwiftBridgingHeaderFileReference({ project });
      if (!bridgingHeaderFileName) {
        return config;
      }
      const [bridgingHeaderFilePath] = globSync(
        `ios/${bridgingHeaderFileName.replace(/['"]/g, '')}`,
        {
          absolute: true,
          cwd: projectRoot,
        }
      );
      if (!bridgingHeaderFilePath) {
        return config;
      }
      let contents = await fs.readFile(bridgingHeaderFilePath, 'utf8');

      if (!contents.match(/^#import\s+<Expo\/Expo\.h>\s*$/m)) {
        contents = addObjcImports(contents, ['<Expo/Expo.h>']);
      }

      await fs.writeFile(bridgingHeaderFilePath, contents);
      return config;
    },
  ]);
};

export function updateModulesAppDelegateObjcImpl(contents: string): string {
  // application:didFinishLaunchingWithOptions:
  const superDidFinishLaunchingWithOptionsCode =
    '[super application:application didFinishLaunchingWithOptions:launchOptions];';
  if (!contents.includes(` ${superDidFinishLaunchingWithOptionsCode}`)) {
    contents = insertContentsInsideObjcFunctionBlock(
      contents,
      'application:didFinishLaunchingWithOptions:',
      superDidFinishLaunchingWithOptionsCode,
      { position: 'tailBeforeLastReturn' }
    );
  }

  return contents;
}

export function updateModulesAppDelegateObjcHeader(contents: string): string {
  // Add imports if needed
  if (!contents.match(/^#import\s+<Expo\/Expo\.h>\s*$/m)) {
    contents = addObjcImports(contents, ['<Expo/Expo.h>']);
  }

  // Replace parent class if needed
  contents = contents.replace(
    /^(\s*@interface\s+AppDelegate\s+:\s+)UIResponder(\s+.+)$/m,
    '$1EXAppDelegateWrapper$2'
  );

  return contents;
}

export function updateModulesAppDelegateSwift(contents: string): string {
  // Replace superclass with AppDelegateWrapper
  contents = contents.replace(
    /^(class\s+AppDelegate\s*:\s*)NSObject,\s*UIApplicationDelegate(\W+)/m,
    '$1AppDelegateWrapper$2'
  );

  // application:didFinishLaunchingWithOptions:
  const superDidFinishLaunchingWithOptionsCode =
    'super.application(application, didFinishLaunchingWithOptions: launchOptions)';
  if (!contents.includes(` ${superDidFinishLaunchingWithOptionsCode}`)) {
    contents = insertContentsInsideSwiftFunctionBlock(
      contents,
      'application(_:didFinishLaunchingWithOptions:)',
      superDidFinishLaunchingWithOptionsCode,
      { position: 'tailBeforeLastReturn', indent: 4 }
    );
  }

  return contents;
}
