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

    const contents = updateModulesAppDelegateObjcHeader(rawContents);
    expect(updateModulesAppDelegateObjcHeader(contents)).toEqual(expectContents);
    // Try it twice...
    const nextContents = updateModulesAppDelegateObjcHeader(contents);
    expect(updateModulesAppDelegateObjcHeader(nextContents)).toEqual(expectContents);
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

    const contents = updateModulesAppDelegateObjcImpl(rawContents);
    expect(contents).toEqual(expectContents);
    // Try it twice...
    const nextContents = updateModulesAppDelegateObjcImpl(contents);
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

    expect(updateModulesAppDelegateSwift(contents)).toEqual(expectContents);
  });
});
