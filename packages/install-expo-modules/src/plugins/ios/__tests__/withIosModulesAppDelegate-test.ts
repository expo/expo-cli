import fs from 'fs';
import path from 'path';

import { getLatestSdkVersion } from '../../../utils/expoVersionMappings';
import {
  updateModulesAppDelegateObjcHeader,
  updateModulesAppDelegateObjcImpl,
  updateModulesAppDelegateSwift,
} from '../withIosModulesAppDelegate';

describe(updateModulesAppDelegateObjcHeader, () => {
  it('should migrate from classic RN AppDelegate header', () => {
    const rawContents = `
#import <React/RCTBridgeDelegate.h>
#import <UIKit/UIKit.h>

@interface AppDelegate : UIResponder <UIApplicationDelegate, RCTBridgeDelegate>

@property (nonatomic, strong) UIWindow *window;

@end`;

    const expectContents = `
#import <React/RCTBridgeDelegate.h>
#import <Expo/Expo.h>
#import <UIKit/UIKit.h>

@interface AppDelegate : EXAppDelegateWrapper <UIApplicationDelegate, RCTBridgeDelegate>

@property (nonatomic, strong) UIWindow *window;

@end`;

    const sdkVersion = getLatestSdkVersion().expoSdkVersion;
    const contents = updateModulesAppDelegateObjcHeader(rawContents, sdkVersion);
    expect(updateModulesAppDelegateObjcHeader(contents, sdkVersion)).toEqual(expectContents);
    // Try it twice...
    const nextContents = updateModulesAppDelegateObjcHeader(contents, sdkVersion);
    expect(updateModulesAppDelegateObjcHeader(nextContents, sdkVersion)).toEqual(expectContents);
  });
});

describe(updateModulesAppDelegateObjcImpl, () => {
  it('should migrate from classic RN AppDelegate implementation', () => {
    const rawContents = `
#import "AppDelegate.h"

#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
#ifdef FB_SONARKIT_ENABLED
  InitializeFlipper(application);
#endif

  RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];
  RCTRootView *rootView = [[RCTRootView alloc] initWithBridge:bridge
                                               moduleName:@"RN0633"
                                               initialProperties:nil];

  rootView.backgroundColor = [[UIColor alloc] initWithRed:1.0f green:1.0f blue:1.0f alpha:1];

  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
  UIViewController *rootViewController = [UIViewController new];
  rootViewController.view = rootView;
  self.window.rootViewController = rootViewController;
  [self.window makeKeyAndVisible];
  return YES;
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index" fallbackResource:nil];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end`;

    const expectContents = `
#import "AppDelegate.h"

#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
#ifdef FB_SONARKIT_ENABLED
  InitializeFlipper(application);
#endif

  RCTBridge *bridge = [self.reactDelegate createBridgeWithDelegate:self launchOptions:launchOptions];
  RCTRootView *rootView = [self.reactDelegate createRootViewWithBridge:bridge
                                               moduleName:@"RN0633"
                                               initialProperties:nil];

  rootView.backgroundColor = [[UIColor alloc] initWithRed:1.0f green:1.0f blue:1.0f alpha:1];

  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
  UIViewController *rootViewController = [self.reactDelegate createRootViewController];
  rootViewController.view = rootView;
  self.window.rootViewController = rootViewController;
  [self.window makeKeyAndVisible];
  [super application:application didFinishLaunchingWithOptions:launchOptions];
  return YES;
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index" fallbackResource:nil];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end`;

    const sdkVersion = getLatestSdkVersion().expoSdkVersion;
    const contents = updateModulesAppDelegateObjcImpl(rawContents, sdkVersion);
    expect(contents).toEqual(expectContents);
    // Try it twice...
    const nextContents = updateModulesAppDelegateObjcImpl(contents, sdkVersion);
    expect(nextContents).toEqual(expectContents);
  });
});

describe(updateModulesAppDelegateSwift, () => {
  it('should migrate from basic RN AppDelegate.swift', () => {
    const contents = `
import UIKit

@UIApplicationMain
class AppDelegate: NSObject, UIApplicationDelegate, RCTBridgeDelegate {
  var window: UIWindow?

  func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    let bridge = RCTBridge(delegate: self, launchOptions: launchOptions)!
    let rootView = RCTRootView(bridge: bridge, moduleName: "HelloWorld", initialProperties: nil)

    if #available(iOS 13.0, *) {
      rootView.backgroundColor = UIColor.systemBackground
    } else {
      rootView.backgroundColor = UIColor.white
    }

    self.window = UIWindow(frame: UIScreen.main.bounds);
    let rootViewController = UIViewController()
    rootViewController.view = rootView
    self.window?.rootViewController = rootViewController
    self.window?.makeKeyAndVisible()
    return true
  }

  func sourceURL(for bridge: RCTBridge!) -> URL! {
    #if DEBUG
    return RCTBundleURLProvider.sharedSettings()?.jsBundleURL(forBundleRoot: "index", fallbackResource: nil)
    #else
    return Bundle.main.url(forResource: "main", withExtension: "jsBundle")
    #endif
  }
}
`;

    const expectContents = `
import UIKit

@UIApplicationMain
class AppDelegate: AppDelegateWrapper, RCTBridgeDelegate {
  var window: UIWindow?

  func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    let bridge = reactDelegate.createBridge(delegate: self, launchOptions: launchOptions)!
    let rootView = reactDelegate.createRootView(bridge: bridge, moduleName: "HelloWorld", initialProperties: nil)

    if #available(iOS 13.0, *) {
      rootView.backgroundColor = UIColor.systemBackground
    } else {
      rootView.backgroundColor = UIColor.white
    }

    self.window = UIWindow(frame: UIScreen.main.bounds);
    let rootViewController = reactDelegate.createRootViewController()
    rootViewController.view = rootView
    self.window?.rootViewController = rootViewController
    self.window?.makeKeyAndVisible()
    super.application(application, didFinishLaunchingWithOptions: launchOptions)
    return true
  }

  func sourceURL(for bridge: RCTBridge!) -> URL! {
    #if DEBUG
    return RCTBundleURLProvider.sharedSettings()?.jsBundleURL(forBundleRoot: "index", fallbackResource: nil)
    #else
    return Bundle.main.url(forResource: "main", withExtension: "jsBundle")
    #endif
  }
}
`;

    const sdkVersion = getLatestSdkVersion().expoSdkVersion;
    expect(updateModulesAppDelegateSwift(contents, sdkVersion)).toEqual(expectContents);
  });
});

describe('withIosModulesAppDelegate sdkVersion snapshots', () => {
  const objcHeaderFixture = fs.readFileSync(
    path.join(__dirname, 'fixtures', 'AppDelegate.h'),
    'utf-8'
  );
  const objcImplFixture = fs.readFileSync(
    path.join(__dirname, 'fixtures', 'AppDelegate.m'),
    'utf-8'
  );
  const swiftFixture = fs.readFileSync(
    path.join(__dirname, 'fixtures', 'AppDelegate.swift'),
    'utf-8'
  );

  ['43.0.0', '44.0.0'].forEach(sdkVersion => {
    it(`sdkVersion ${sdkVersion}`, () => {
      expect(updateModulesAppDelegateObjcHeader(objcHeaderFixture, sdkVersion)).toMatchSnapshot();
      expect(updateModulesAppDelegateObjcImpl(objcImplFixture, sdkVersion)).toMatchSnapshot();
      expect(updateModulesAppDelegateSwift(swiftFixture, sdkVersion)).toMatchSnapshot();
    });
  });
});
