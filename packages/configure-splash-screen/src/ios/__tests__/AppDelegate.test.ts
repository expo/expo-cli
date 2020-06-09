import { vol } from 'memfs';

import configureAppDelegate from '../AppDelegate';

// in `__mocks__/fs.ts` memfs is being used as a mocking library
jest.mock('fs');

describe('AppDelegate', () => {
  describe('configureAppDelegate', () => {
    const iosProjectPath = `/app/ios/ReactNativeProject`;

    afterEach(() => {
      vol.reset();
    });

    describe(`handles integration with 'expo-updates'`, () => {
      describe('for Objective-C project', () => {
        const appDelegatePath = `${iosProjectPath}/AppDelegate.m`;

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
          await configureAppDelegate(iosProjectPath);
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
          await configureAppDelegate(iosProjectPath);
          const result = vol.readFileSync(appDelegatePath, 'utf-8');
          const expected = generateAppDelegate({ addExpoSplashScreen: true, addExpoUpdates: true });
          expect(result).toEqual(expected);
        });

        it(`inserts proper 'SplashScreenService.showSplashScreenFor' call`, async () => {
          vol.fromJSON({ [appDelegatePath]: generateAppDelegate({ addExpoUpdates: true }) });
          await configureAppDelegate(iosProjectPath);
          const result = vol.readFileSync(appDelegatePath, 'utf-8');
          const expected = generateAppDelegate({ addExpoSplashScreen: true, addExpoUpdates: true });
          expect(result).toEqual(expected);
        });
      });

      describe('for Swift project', () => {});
    });
  });
});
