import { vol } from 'memfs';

import configureAppDelegate from '../AppDelegate';
import readPbxProject, { IosProject } from '../pbxproj';
import reactNativeProjectStructure from './fixtures/react-native-project-structure';

// in `__mocks__/fs.ts` memfs is being used as a mocking library
jest.mock('fs');

describe('AppDelegate', () => {
  describe('configureAppDelegate', () => {
    const iosRootProjectPath = '/app/ios';
    const iosProjectPath = `${iosRootProjectPath}/ReactNativeProject`;

    afterEach(() => {
      vol.reset();
    });

    describe(`handles integration with 'expo-updates'`, () => {
      describe('for Objective-C project', () => {
        const appDelegatePath = `${iosProjectPath}/AppDelegate.m`;
        // @ts-expect-error
        const iosProject: IosProject = { projectPath: iosProjectPath };

        function generateAppDelegate({
          addExpoUpdates,
          addExpoSplashScreen,
        }: { addExpoUpdates?: boolean; addExpoSplashScreen?: boolean } = {}) {
          return `#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>

#import <UMCore/UMModuleRegistry.h>
#import <UMReactNativeAdapter/UMNativeModulesProxy.h>
#import <UMReactNativeAdapter/UMModuleRegistryAdapter.h>
${
  !addExpoSplashScreen
    ? ''
    : `
#import <EXSplashScreen/EXSplashScreenService.h>
#import <UMCore/UMModuleRegistryProvider.h>
`
}${
            !addExpoUpdates
              ? ''
              : `
@interface AppDelegate ()

@property (nonatomic, strong) NSDictionary *launchOptions;

@end
`
          }
@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleRegistryAdapter = [[UMModuleRegistryAdapter alloc] initWithModuleRegistryProvider:[[UMModuleRegistryProvider alloc] init]];${
    !addExpoUpdates
      ? `
  RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];
  RCTRootView *rootView = [[RCTRootView alloc] initWithBridge:bridge moduleName:@"HelloWorld" initialProperties:nil];
  rootView.backgroundColor = [[UIColor alloc] initWithRed:1.0f green:1.0f blue:1.0f alpha:1];
  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
  UIViewController *rootViewController = [UIViewController new];
  rootViewController.view = rootView;
  self.window.rootViewController = rootViewController;
  [self.window makeKeyAndVisible];`
      : `
  self.launchOptions = launchOptions;
  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];

#ifdef DEBUG
  [self initializeReactNativeApp];
#else
  EXUpdatesAppController *controller = [EXUpdatesAppController sharedInstance];
  controller.delegate = self;
  [controller startAndShowLaunchScreen:self.window];
#endif
`
  }
  [super application:application didFinishLaunchingWithOptions:launchOptions];

  return YES;
}
${
  !addExpoUpdates
    ? ''
    : `
- (RCTBridge *)initializeReactNativeApp
{
  RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:self.launchOptions];
  RCTRootView *rootView = [[RCTRootView alloc] initWithBridge:bridge moduleName:@"HelloWorld" initialProperties:nil];
  rootView.backgroundColor = [[UIColor alloc] initWithRed:1.0f green:1.0f blue:1.0f alpha:1];

  UIViewController *rootViewController = [UIViewController new];
  rootViewController.view = rootView;
${
  !addExpoSplashScreen
    ? ''
    : `
  EXSplashScreenService *splashScreenService = (EXSplashScreenService *)[UMModuleRegistryProvider getSingletonModuleForClass:[EXSplashScreenService class]];
  [splashScreenService showSplashScreenFor:rootViewController];
`
}
  self.window.rootViewController = rootViewController;
  [self.window makeKeyAndVisible];

  return bridge;
}
`
}
- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index" fallbackResource:nil];
#else
  return ${
    addExpoUpdates
      ? `[[EXUpdatesAppController sharedInstance] launchAssetUrl]`
      : `[[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"]`
  };
#endif
}
${
  !addExpoUpdates
    ? ''
    : `
- (void)appController:(EXUpdatesAppController *)appController didStartWithSuccess:(BOOL)success
{
  appController.bridge = [self initializeReactNativeApp];
}
`
}
@end
`;
        }

        it(`does nothing when there's no 'expo-updates' present`, async () => {
          vol.fromJSON({ [appDelegatePath]: generateAppDelegate() });
          await configureAppDelegate(iosProject);
          const result = vol.readFileSync(appDelegatePath, 'utf-8');
          const expected = generateAppDelegate();
          expect(result).toEqual(expected);
        });

        it(`does nothing when it's already configured`, async () => {
          vol.fromJSON({
            [appDelegatePath]: generateAppDelegate({
              addExpoSplashScreen: true,
              addExpoUpdates: true,
            }),
          });
          await configureAppDelegate(iosProject);
          const result = vol.readFileSync(appDelegatePath, 'utf-8');
          const expected = generateAppDelegate({ addExpoSplashScreen: true, addExpoUpdates: true });
          expect(result).toEqual(expected);
        });

        it(`inserts proper 'SplashScreenService.showSplashScreenFor' call`, async () => {
          vol.fromJSON({ [appDelegatePath]: generateAppDelegate({ addExpoUpdates: true }) });
          await configureAppDelegate(iosProject);
          const result = vol.readFileSync(appDelegatePath, 'utf-8');
          const expected = generateAppDelegate({ addExpoSplashScreen: true, addExpoUpdates: true });
          expect(result).toEqual(expected);
        });
      });

      describe('for Swift project', () => {
        const appDelegatePath = `${iosProjectPath}/AppDelegate.swift`;
        let iosProject: IosProject;

        function generateAppDelegate({
          addExpoUpdates,
          addExpoSplashScreen,
        }: { addExpoUpdates?: boolean; addExpoSplashScreen?: boolean } = {}) {
          return `
import Foundation

@UIApplicationMain
class AppDelegate: UMAppDelegateWrapper {
  var moduleRegistryAdapter: UMModuleRegistryAdapter!
  var launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  
  override func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    moduleRegistryAdapter = UMModuleRegistryAdapter(moduleRegistryProvider: UMModuleRegistryProvider())
    self.launchOptions = launchOptions
    window = UIWindow(frame: UIScreen.main.bounds)

${
  !addExpoUpdates
    ? `
    if let bridge = RCTBridge(delegate: self, launchOptions: launchOptions) {
      let rootView = RCTRootView(bridge: bridge, moduleName: "BareExpo", initialProperties: nil)
      let rootViewController = UIViewController()
      rootView.backgroundColor = UIColor.white
      rootViewController.view = rootView
      
      window?.rootViewController = rootViewController
      window?.makeKeyAndVisible()
    }
`
    : `
#if DEBUG
_ = initializeReactNativeApp();
#else
let controller = EXUpdatesAppController.sharedInstance()
controller.delegate = self;
controller.startAndShowLaunchScreen(self.window)
#endif
`
}
    super.application(application, didFinishLaunchingWithOptions: launchOptions)
    
    return true
  }
 
${
  !addExpoUpdates
    ? ''
    : `  
  func initializeReactNativeApp() -> RCTBridge {
    let bridge = RCTBridge(delegate: self, launchOptions: launchOptions)!
    
    let rootView = RCTRootView(bridge: bridge, moduleName: "BareExpo", initialProperties: nil)
    let rootViewController = UIViewController()
    rootView.backgroundColor = UIColor.white
    rootViewController.view = rootView
${
  !addExpoSplashScreen
    ? ''
    : `
    let splashScreenService: EXSplashScreenService = UMModuleRegistryProvider.getSingletonModule(for: EXSplashScreenService) as! EXSplashScreenService
    splashScreenService.showSplashScreen(for: rootViewController)
`
}
    window?.rootViewController = rootViewController
    window?.makeKeyAndVisible()

    return bridge
  }
`
}
${
  !addExpoUpdates
    ? ''
    : `
// MARK: - EXUpdatesAppControllerDelegate

extension AppDelegate: EXUpdatesAppControllerDelegate {
  func appController(_ appController: EXUpdatesAppController, didStartWithSuccess success: Bool) {
    appController.bridge = self.initializeReactNativeApp();
  }
}
`
}
// MARK: - RCTBridgeDelegate

extension AppDelegate: RCTBridgeDelegate {
}
`;
        }

        beforeEach(async () => {
          vol.fromJSON(
            {
              ...reactNativeProjectStructure,
              'ios/ReactNativeProject.xcodeproj/project.pbxproj': reactNativeProjectStructure[
                'ios/ReactNativeProject.xcodeproj/project.pbxproj'
              ]
                .replace(
                  /(?=(\/\* End PBXFileReference section \*\/))/m,
                  '\n    CD59639A247F2EF90030EECA /* BareExpo-Bridging-Header.h */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.c.h; path = "BareExpo-Bridging-Header.h"; sourceTree = "<group>"; };'
                )
                .replace(
                  /(?<=(13B07F951A680F5B00A75B9A \/\* Release \*\/ = {(.|\n)*PRODUCT_NAME = ReactNativeProject;))/m,
                  '\n				SWIFT_OBJC_BRIDGING_HEADER = "BareExpo-Bridging-Header.h";'
                ),
              'ios/BareExpo-Bridging-Header.h': `
// React
#import <React/RCTBridgeModule.h>
#import <React/RCTBridge.h>
#import <React/RCTEventDispatcher.h>
#import <React/RCTRootView.h>
#import <React/RCTUtils.h>
#import <React/RCTConvert.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTBridgeDelegate.h>
#import <React/RCTLinkingManager.h>
#import <React/RCTDevMenu.h>
#import <React/RCTKeyCommands.h>
#import <React/RCTRedBox.h>

// Unimodules
#import <UMCore/UMModuleRegistry.h>
#import <UMReactNativeAdapter/UMNativeModulesProxy.h>
#import <UMReactNativeAdapter/UMModuleRegistryAdapter.h>
#import <UMCore/UMAppDelegateWrapper.h>

// OTA Updates
#import <EXUpdates/EXUpdatesAppController.h>
`,
            },
            '/app'
          );
          vol.unlinkSync('/app/ios/ReactNativeProject/AppDelegate.m');
          iosProject = await readPbxProject(iosRootProjectPath);
        });

        it(`does nothing when there's no 'expo-updates' present`, async () => {
          vol.writeFileSync(appDelegatePath, generateAppDelegate());
          await configureAppDelegate(iosProject);
          const result = vol.readFileSync(appDelegatePath, 'utf-8');
          const expected = generateAppDelegate();
          expect(result).toEqual(expected);
        });

        it(`does nothing when it's already configured`, async () => {
          vol.writeFileSync(
            appDelegatePath,
            generateAppDelegate({ addExpoSplashScreen: true, addExpoUpdates: true })
          );
          await configureAppDelegate(iosProject);
          const result = vol.readFileSync(appDelegatePath, 'utf-8');
          const expected = generateAppDelegate({ addExpoSplashScreen: true, addExpoUpdates: true });
          expect(result).toEqual(expected);
        });

        it(`inserts proper 'SplashScreenService.showSplashScreenFor' call`, async () => {
          vol.writeFileSync(appDelegatePath, generateAppDelegate({ addExpoUpdates: true }));
          await configureAppDelegate(iosProject);
          const result = vol.readFileSync(appDelegatePath, 'utf-8');
          const expected = generateAppDelegate({ addExpoSplashScreen: true, addExpoUpdates: true });
          expect(result).toEqual(expected);
        });

        it(`inserts proper import in Bridging-Header file`, async () => {
          vol.writeFileSync(appDelegatePath, generateAppDelegate({ addExpoUpdates: true }));
          await configureAppDelegate(iosProject);
          const result = vol.readFileSync(
            `${iosRootProjectPath}/BareExpo-Bridging-Header.h`,
            'utf-8'
          );
          expect(result).toMatch(/#import <EXSplashScreen\/EXSplashScreenService.h>/);
        });
      });
    });
  });
});
