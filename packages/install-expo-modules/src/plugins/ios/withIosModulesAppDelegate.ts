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
import fs from 'fs';
import { sync as globSync } from 'glob';
import semver from 'semver';
import xcode from 'xcode';

export const withIosModulesAppDelegate: ConfigPlugin = config => {
  return withAppDelegate(config, config => {
    config.modResults.contents =
      config.modResults.language === 'objc'
        ? updateModulesAppDelegateObjcImpl(config.modResults.contents, config.sdkVersion)
        : updateModulesAppDelegateSwift(config.modResults.contents, config.sdkVersion);
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
        let contents = await fs.promises.readFile(appDelegateObjcHeaderPath, 'utf8');
        contents = updateModulesAppDelegateObjcHeader(contents, config.sdkVersion);
        await fs.promises.writeFile(appDelegateObjcHeaderPath, contents);
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
      let contents = await fs.promises.readFile(bridgingHeaderFilePath, 'utf8');

      if (!contents.match(/^#import\s+<Expo\/Expo\.h>\s*$/m)) {
        contents = addObjcImports(contents, ['<Expo/Expo.h>']);
      }

      await fs.promises.writeFile(bridgingHeaderFilePath, contents);
      return config;
    },
  ]);
};

export function updateModulesAppDelegateObjcImpl(
  contents: string,
  sdkVersion: string | undefined
): string {
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

  // ExpoReactDelegate
  if (sdkVersion && semver.gte(sdkVersion, '44.0.0')) {
    contents = contents.replace(
      /\[\[RCTBridge alloc\] initWithDelegate:/g,
      '[self.reactDelegate createBridgeWithDelegate:'
    );
    contents = contents.replace(
      /\[\[RCTRootView alloc\] initWithBridge:/g,
      '[self.reactDelegate createRootViewWithBridge:'
    );
    contents = contents.replace(
      /\[UIViewController new\]/g,
      '[self.reactDelegate createRootViewController]'
    );
  }

  return contents;
}

export function updateModulesAppDelegateObjcHeader(
  contents: string,
  sdkVersion: string | undefined
): string {
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

export function updateModulesAppDelegateSwift(
  contents: string,
  sdkVersion: string | undefined
): string {
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

  // ExpoReactDelegate
  if (sdkVersion && semver.gte(sdkVersion, '44.0.0')) {
    contents = contents.replace(/\bRCTBridge\(delegate:/g, 'reactDelegate.createBridge(delegate:');
    contents = contents.replace(/\bRCTRootView\(bridge:/g, 'reactDelegate.createRootView(bridge:');
    contents = contents.replace(
      /\bUIViewController\(\)/g,
      'reactDelegate.createRootViewController()'
    );
  }

  return contents;
}
