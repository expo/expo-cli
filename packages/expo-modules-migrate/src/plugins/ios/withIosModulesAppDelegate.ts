import { ConfigPlugin, withAppDelegate, withDangerousMod } from '@expo/config-plugins';
import {
  getAppDelegateObjcHeaderFilePath,
  getPBXProjectPath,
} from '@expo/config-plugins/build/ios/Paths';
import { getDesignatedSwiftBridgingHeaderFileReference } from '@expo/config-plugins/build/ios/Swift';
import {
  addObjcImports,
  findObjcFunctionCodeBlock,
  findObjcInterfaceCodeBlock,
  findSwiftFunctionCodeBlock,
  insertContentsInsideObjcFunctionBlock,
  insertContentsInsideObjcInterfaceBlock,
  insertContentsInsideSwiftClassBlock,
  insertContentsInsideSwiftFunctionBlock,
} from '@expo/config-plugins/build/ios/codeMod';
import fs from 'fs-extra';
import { sync as globSync } from 'glob';
import xcode from 'xcode';

import { insertContentsAtOffset } from '../../../../config-plugins/build/utils/commonCodeMod';

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

      if (!contents.match(/^#import\s+<EXModulesCore\/EXAppDelegateWrapper\.h>\s*$/m)) {
        contents = addObjcImports(contents, ['<EXModulesCore/EXAppDelegateWrapper.h>']);
      }

      if (!contents.match(/^#import\s+<EXModulesCore\/EXModulesRegistryAdapter\.h>\s*$/m)) {
        contents = addObjcImports(contents, ['<EXModulesCore/EXModulesRegistryAdapter.h>']);
      }

      await fs.writeFile(bridgingHeaderFilePath, contents);
      return config;
    },
  ]);
};

export function updateModulesAppDelegateObjcImpl(contents: string): string {
  // Add imports if needed
  if (!contents.match(/^#import\s+<EXModulesCore\/EXModulesRegistryAdapter\.h>\s*$/m)) {
    contents = addObjcImports(contents, ['<EXModulesCore/EXModulesRegistryAdapter.h>']);
  }

  // moduleRegistryAdapter property
  const moduleRegistryAdapterCode =
    '@property (nonatomic, strong) EXModuleRegistryAdapter *moduleRegistryAdapter;';
  if (contents.indexOf(moduleRegistryAdapterCode) < 0) {
    const offset =
      findObjcInterfaceCodeBlock(contents, '@implementation AppDelegate')?.start ??
      contents.length - 1;
    const code = ['@interface AppDelegate()\n', moduleRegistryAdapterCode, '\n@end\n\n'].join('\n');
    contents = insertContentsAtOffset(contents, code, offset);
  }

  // application:didFinishLaunchingWithOptions:
  const initWithModuleRegistryProviderCode =
    'self.moduleRegistryAdapter = [[EXModuleRegistryAdapter alloc] initWithModuleRegistryProvider:[[EXModuleRegistryProvider alloc] init]];';
  if (contents.indexOf(` ${initWithModuleRegistryProviderCode}`) < 0) {
    contents = insertContentsInsideObjcFunctionBlock(
      contents,
      'application:didFinishLaunchingWithOptions:',
      initWithModuleRegistryProviderCode,
      { position: 'head' }
    );
  }
  const superDidFinishLaunchingWithOptionsCode =
    '[super application:application didFinishLaunchingWithOptions:launchOptions];';
  if (contents.indexOf(` ${superDidFinishLaunchingWithOptionsCode}`) < 0) {
    contents = insertContentsInsideObjcFunctionBlock(
      contents,
      'application:didFinishLaunchingWithOptions:',
      superDidFinishLaunchingWithOptionsCode,
      { position: 'tailBeforeLastReturn' }
    );
  }

  // extraModulesForBridge
  if (!findObjcFunctionCodeBlock(contents, 'extraModulesForBridge:')) {
    const extraModulesForBridgeCodeBlock = [
      '- (NSArray<id<RCTBridgeModule>> *)extraModulesForBridge:(RCTBridge *)bridge',
      '{',
      '    NSArray<id<RCTBridgeModule>> *extraModules = [_moduleRegistryAdapter extraModulesForBridge:bridge];',
      "    // If you'd like to export some custom RCTBridgeModules that are not Expo modules, add them here!",
      '    return extraModules;',
      '}\n\n',
    ].join('\n');
    contents = insertContentsInsideObjcInterfaceBlock(
      contents,
      '@implementation AppDelegate',
      extraModulesForBridgeCodeBlock,
      { position: 'tail' }
    );
  } else if (contents.indexOf(' [_moduleRegistryAdapter extraModulesForBridge:bridge]') < 0) {
    throw new Error('Unsupported flow for custom extraModulesForBridge');
  }

  return contents;
}

export function updateModulesAppDelegateObjcHeader(contents: string): string {
  // Add imports if needed
  if (!contents.match(/^#import\s+<EXModulesCore\/EXAppDelegateWrapper\.h>\s*$/m)) {
    contents = addObjcImports(contents, ['<EXModulesCore/EXAppDelegateWrapper.h>']);
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

  // moduleRegistryAdapter property
  const moduleRegistryAdapterCode = 'var moduleRegistryAdapter: ModuleRegistryAdapter!';
  if (contents.indexOf(moduleRegistryAdapterCode) < 0) {
    contents = insertContentsInsideSwiftClassBlock(
      contents,
      'class AppDelegate',
      `\n  ${moduleRegistryAdapterCode}`,
      { position: 'head' }
    );
  }

  // application:didFinishLaunchingWithOptions:
  const initWithModuleRegistryProviderCode =
    'moduleRegistryAdapter = ModuleRegistryAdapter(moduleRegistryProvider: ModuleRegistryProvider())';
  if (contents.indexOf(` ${initWithModuleRegistryProviderCode}`) < 0) {
    contents = insertContentsInsideSwiftFunctionBlock(
      contents,
      'application(_:didFinishLaunchingWithOptions:)',
      `  ${initWithModuleRegistryProviderCode}`,
      { position: 'head' }
    );
  }
  const superDidFinishLaunchingWithOptionsCode =
    'super.application(application, didFinishLaunchingWithOptions: launchOptions)';
  if (contents.indexOf(` ${superDidFinishLaunchingWithOptionsCode}`) < 0) {
    contents = insertContentsInsideSwiftFunctionBlock(
      contents,
      'application(_:didFinishLaunchingWithOptions:)',
      superDidFinishLaunchingWithOptionsCode,
      { position: 'tailBeforeLastReturn', indent: 4 }
    );
  }

  // extraModulesForBridge
  if (!findSwiftFunctionCodeBlock(contents, 'extraModules(for:)')) {
    const extraModulesForBridgeCodeBlock = [
      '\n  func extraModules(for bridge: RCTBridge!) -> [RCTBridgeModule] {',
      '    var extraModules = moduleRegistryAdapter.extraModules(for: bridge)',
      "    // If you'd like to export some custom RCTBridgeModules that are not Expo modules, add them here!",
      '    return extraModules',
      '  }\n',
    ].join('\n');
    contents = insertContentsInsideSwiftClassBlock(
      contents,
      'class AppDelegate',
      extraModulesForBridgeCodeBlock,
      { position: 'tail' }
    );
  } else if (contents.indexOf(' moduleRegistryAdapter extraModules(for: bridge)') < 0) {
    throw new Error('Unsupported flow for custom extraModulesForBridge');
  }

  return contents;
}
