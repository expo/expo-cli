export type PackageJSONConfig = { [key: string]: any };
export type ProjectConfig = { exp: ExpoConfig; pkg: PackageJSONConfig; rootConfig: AppJSONConfig };
export type AppJSONConfig = { expo: ExpoConfig; [key: string]: any };
export type BareAppConfig = { name: string; displayName: string; [key: string]: any };

type ExpoOrientation = 'default' | 'portrait' | 'landscape';
type ExpoPrivacy = 'public' | 'unlisted';
type SplashResizeMode = 'cover' | 'contain';

/**
 * 6 character long hex color string, eg: `'#000000'`
 * @pattern ^#|(&#x23;)\\d{6}$
 */
type Color = string;

type AndroidMode = 'default' | 'collapse';

type AndroidBarStyle = 'light-content' | 'dark-content';

export type IntentFilter = {
  action: string;
  category?: string[];
  autoVerify?: boolean;
  data?: {
    scheme?: string;
    host?: string;
    port?: string;
    path?: string;
    pathPattern?: string;
    pathPrefix?: string;
    mimeType?: string;
  };
};

type WebAppleBarStyle = 'default' | 'black' | 'black-translucent';

/**
 * Configuration for loading and splash screen for standalone apps.
 */
type Splash = {
  /**
   * Color to fill the loading screen background
   */
  backgroundColor?: Color;

  /**
   * Determines how the `image` will be displayed in the splash loading screen.
   */
  resizeMode?: SplashResizeMode;

  /**
   * Local path or remote url to an image to fill the background of the loading screen. Image size and aspect ratio are up to you. Must be a .png.
   */
  image?: Image;
};

/**
 * Local path or remote url to an image to use as an image.
 * {
 *   asset: true
 *   contentTypePattern: "^image/png$"
 *   contentTypeHuman: ".png image"
 * }
 */
type Image = string;

/**
 * Local path or remote url to an image to use as an icon.
 * {
 *   asset: true
 *   contentTypePattern: "^image/png$"
 *   contentTypeHuman: ".png image"
 *   square: true
 * }
 */
type Icon = string;

type AndroidAdaptiveIcon = {
  /**
   * Local path or remote url to an image to use for your app's icon on Android. If specified, this overrides the top-level `icon` and the `android.icon` keys. Should follow the guidelines specified at https://developer.android.com/guide/practices/ui_guidelines/icon_design_adaptive. This icon will appear on the home screen.
   */
  foregroundImage?: Icon;

  /**
   * Local path or remote url to a background image for your app's Adaptive Icon on Android. If specified, this overrides the `backgroundColor` key. Should follow the guidelines specified at https://developer.android.com/guide/practices/ui_guidelines/icon_design_adaptive.
   */
  backgroundImage?: Icon;

  /**
   * Color to use as the background for your app's Adaptive Icon on Android.
   */
  backgroundColor?: Color;
};

export type AndroidPlatformConfig = {
  /**
   * @autogenerated
   */
  publishSourceMapPath?: string;
  /**
   * The manifest for the Android version of your app will be written to this path during publish.
   * {
   *   autogenerated: true
   * }
   */
  publishManifestPath?: string;

  /**
   * The bundle for the Android version of your app will be written to this path during publish.
   * {
   *   autogenerated: true
   * }
   */
  publishBundlePath?: string;

  /**
   * The package name for your Android standalone app. You make it up, but it needs to be unique on the Play Store. See [this StackOverflow question](http://stackoverflow.com/questions/6273892/android-package-name-convention).
   * @pattern ^[a-zA-Z][a-zA-Z0-9\\_]*(\\.[a-zA-Z][a-zA-Z0-9\\_]*)+$
   * @regexHuman Reverse DNS notation unique name for your app. For example, host.exp.exponent, where exp.host is our domain and Expo is our app. The name may only contain lowercase and uppercase letters (a-z, A-Z), numbers (0-9) and underscores (_). Each component of the name should start with a lowercase letter.
   */
  package?: string;
  /**
   * Version number required by Google Play. Increment by one for each release. Must be an integer. https://developer.android.com/studio/publish/versioning.html
   */
  versionCode?: number;

  /**
   * Local path or remote url to an image to use for your app's icon on Android. If specified, this overrides the top-level `icon` key. We recommend that you use a 1024x1024 png file (transparency is recommended for the Google Play Store). This icon will appear on the home screen and within the Expo app.
   */
  icon?: Icon;

  adaptiveIcon?: AndroidAdaptiveIcon;

  /**
   * URL to your app on the Google Play Store, if you have deployed it there. This is used to link to your store page from your Expo project page if your app is public.
   * @pattern ^https://play\\.google\\.com/
   * @example https://play.google.com/store/apps/details?id=host.exp.exponent
   */
  playStoreUrl?: string;

  /**
   * List of permissions used by the standalone app. Remove the field to use the default list of permissions.\n\n  Example: `[ \"CAMERA\", \"ACCESS_FINE_LOCATION\" ]`.\n\n  You can specify the following permissions depending on what you need:\n\n- `ACCESS_COARSE_LOCATION`\n- `ACCESS_FINE_LOCATION`\n- `CAMERA`\n- `MANAGE_DOCUMENTS`\n- `READ_CONTACTS`\n- `READ_EXTERNAL_STORAGE`\n- `READ_INTERNAL_STORAGE`\n- `READ_PHONE_STATE`\n- `RECORD_AUDIO`\n- `USE_FINGERPRINT`\n- `VIBRATE`\n- `WAKE_LOCK`\n- `WRITE_EXTERNAL_STORAGE`\n- `com.anddoes.launcher.permission.UPDATE_COUNT`\n- `com.android.launcher.permission.INSTALL_SHORTCUT`\n- `com.google.android.c2dm.permission.RECEIVE`\n- `com.google.android.gms.permission.ACTIVITY_RECOGNITION`\n- `com.google.android.providers.gsf.permission.READ_GSERVICES`\n- `com.htc.launcher.permission.READ_SETTINGS`\n- `com.htc.launcher.permission.UPDATE_SHORTCUT`\n- `com.majeur.launcher.permission.UPDATE_BADGE`\n- `com.sec.android.provider.badge.permission.READ`\n- `com.sec.android.provider.badge.permission.WRITE`\n- `com.sonyericsson.home.permission.BROADCAST_BADGE`
   */
  permissions?: string[];

  /**
   * [Firebase Configuration File](https://support.google.com/firebase/answer/7015592) google-services.json file for configuring Firebase.
   */
  googleServicesFile?: string;

  config?: {
    /**
     * [Branch](https://branch.io/) key to hook up Branch linking services.
     */
    branch?: {
      /**
       * Your Branch API key
       */
      apiKey?: string;
    };

    /**
     * [Google Developers Fabric](https://get.fabric.io/) keys to hook up Crashlytics and other services.
     */
    fabric?: {
      /**
       * Your Fabric API key
       */
      apiKey?: string;
      /**
       * Your Fabric build secret
       */
      buildSecret?: string;
    };
    /**
     * [Google Maps Android SDK](https://developers.google.com/maps/documentation/android-api/signup) key for your standalone app.
     */
    googleMaps?: {
      /**
       * Your Google Maps Android SDK API key
       */
      apiKey: string;
    };
    /**
     * [Google Mobile Ads App ID](https://support.google.com/admob/answer/6232340) Google AdMob App ID.
     */
    googleMobileAdsAppId?: string;
    /**
     * [Google Sign-In Android SDK](https://developers.google.com/identity/sign-in/android/start-integrating) keys for your standalone app.
     */
    googleSignIn?: {
      /**
       * The Android API key. Can be found in the credentials section of the developer console or in `google-services.json`.
       */
      apiKey: string;

      /**
       * The SHA-1 hash of the signing certificate used to build the apk without any separator `:`. Can be found in `google-services.json`. https://developers.google.com/android/guides/client-auth
       */
      certificateHash: string;
    };
  };
  /**
   * Configuration for loading and splash screen for standalone Android apps.
   */
  splash?: {
    /**
     * Color to fill the loading screen background
     */
    backgroundColor?: Color;

    /**
     * Determines how the `image` will be displayed in the splash loading screen. Must be one of `cover`, `contain` or `native`, defaults to `contain`.
     */
    resizeMode?: 'cover' | 'contain' | 'native';
    /**
     * Local path or remote url to an image to fill the background of the loading screen. Image size and aspect ratio are up to you. Must be a .png.
     */
    mdpi?: Image;
    /**
     * Local path or remote url to an image to fill the background of the loading screen. Image size and aspect ratio are up to you. Must be a .png.
     */
    hdpi?: Image;
    /**
     * Local path or remote url to an image to fill the background of the loading screen. Image size and aspect ratio are up to you. Must be a .png.
     */
    xhdpi?: Image;
    /**
     * Local path or remote url to an image to fill the background of the loading screen. Image size and aspect ratio are up to you. Must be a .png.
     */
    xxhdpi?: Image;
    /**
     * Local path or remote url to an image to fill the background of the loading screen. Image size and aspect ratio are up to you. Must be a .png.
     */
    xxxhdpi?: Image;
  };
  /**
     * An array of intent filters.
     * @uniqueItems
     * @example [{
        "autoVerify": true,
        "action": "VIEW",
        "data": {
          "scheme": "https",
          "host": "*.expo.io"
        },
        "category": [
          "BROWSABLE",
          "DEFAULT"
        ]
      }]
     */
  intentFilters?: IntentFilter | IntentFilter[];
};

// tslint:disable-next-line:max-line-length
type Devtool =
  | 'eval'
  | 'inline-source-map'
  | 'cheap-eval-source-map'
  | 'cheap-source-map'
  | 'cheap-module-eval-source-map'
  | 'cheap-module-source-map'
  | 'eval-source-map'
  | 'source-map'
  | 'nosources-source-map'
  | 'hidden-source-map'
  | 'nosources-source-map'
  | 'inline-cheap-source-map'
  | 'inline-cheap-module-source-map'
  | '@eval'
  | '@inline-source-map'
  | '@cheap-eval-source-map'
  | '@cheap-source-map'
  | '@cheap-module-eval-source-map'
  | '@cheap-module-source-map'
  | '@eval-source-map'
  | '@source-map'
  | '@nosources-source-map'
  | '@hidden-source-map'
  | '@nosources-source-map'
  | '#eval'
  | '#inline-source-map'
  | '#cheap-eval-source-map'
  | '#cheap-source-map'
  | '#cheap-module-eval-source-map'
  | '#cheap-module-source-map'
  | '#eval-source-map'
  | '#source-map'
  | '#nosources-source-map'
  | '#hidden-source-map'
  | '#nosources-source-map'
  | '#@eval'
  | '#@inline-source-map'
  | '#@cheap-eval-source-map'
  | '#@cheap-source-map'
  | '#@cheap-module-eval-source-map'
  | '#@cheap-module-source-map'
  | '#@eval-source-map'
  | '#@source-map'
  | '#@nosources-source-map'
  | '#@hidden-source-map'
  | '#@nosources-source-map'
  | boolean;

/**
 * Web platform specific configuration
 */
export type WebPlatformConfig = {
  [key: string]: any;

  /**
   * Relative path of an image to use for your app's favicon.
   */
  favicon?: string;

  /**
   * Defines the title of the document, defaults to the outer level name
   * @pwa name
   * @metatag title
   */
  name?: string;
  /**
   * A short version of the app's name, 12 characters or fewer. Used in app launcher and new tab pages. Maps to `short_name` in the PWA manifest.json. Defaults to the `name` property.
   * @pwa short_name
   * @regexHuman Maximum 12 characters long
   */
  shortName?: string;

  /**
   * Specifies the primary language for the values in the name and short_name members. This value is a string containing a single language tag.
   * @fallback 'en'
   * @pwa lang
   */
  lang?: string;

  /**
   * Defines the navigation scope of this website's context. This restricts what web pages can be viewed while the manifest is applied. If the user navigates outside the scope, it returns to a normal web page inside a browser tab/window. If the scope is a relative URL, the base URL will be the URL of the manifest.
   * @pwa scope
   */
  scope?: string;
  /**
   * Defines the color of the Android tool bar, and may be reflected in the app's preview in task switchers.
   * @fallback 'expo.primaryColor', '#4630EB'
   * @pwa theme_color
   * @metatag theme-color
   */
  themeColor?: Color;
  /**
   * Provides a general description of what the pinned website does.
   * @fallback 'expo.description'
   * @pwa description
   */
  description?: string;
  /**
   * Specifies the primary text direction for the name, short_name, and description members. Together with the lang member, it helps the correct display of right-to-left languages.
   * @fallback auto
   * @pwa dir
   *
   */
  dir?: 'auto' | 'ltr' | 'rtl';
  /**
   * Defines the developers’ preferred display mode for the website.
   * @fallback standalone
   * @pwa display
   */
  display?: 'fullscreen' | 'standalone' | 'minimal-ui' | 'browser';
  /**
   * The URL that loads when a user launches the application (e.g. when added to home screen), typically the index. Note that this has to be a relative URL, relative to the manifest URL.
   * @pwa start_url
   */
  startUrl?: string;
  /**
   * Defines the default orientation for all the website's top level browsing contexts.
   * @pwa orientation
   */
  orientation?:
    | 'any'
    | 'natural'
    | 'landscape'
    | 'landscape-primary'
    | 'landscape-secondary'
    | 'portrait'
    | 'portrait-primary'
    | 'portrait-secondary';

  /**
   * Defines the expected “background color” for the website. This value repeats what is already available in the site’s CSS, but can be used by browsers to draw the background color of a shortcut when the manifest is available before the stylesheet has loaded. This creates a smooth transition between launching the web application and loading the site's content.
   * @pwa background_color
   * @fallback 'expo.splash.backgroundColor', '#ffffff'
   */
  backgroundColor?: Color;
  /**
   * If content is set to default, the status bar appears normal. If set to black, the status bar has a black background. If set to black-translucent, the status bar is black and translucent. If set to default or black, the web content is displayed below the status bar. If set to black-translucent, the web content is displayed on the entire screen, partially obscured by the status bar.
   *
   * @fallback black-translucent
   * @metatag apple-mobile-web-app-status-bar-style
   */
  barStyle?: WebAppleBarStyle;

  /**
   * Hints for the user agent to indicate to the user that the specified native applications (defined in expo.ios and expo.android) are recommended over the website.
   * @pwa prefer_related_applications
   */
  preferRelatedApplications?: boolean;

  /**
   * Basic customization options for configuring the default webpack config
   */
  build?: {
    [key: string]: any;

    /**
     * ID of the root DOM element in your index.html. By default this is "root".
     * @fallback root
     */
    rootId?: string;

    /**
     * Choose a custom style of source mapping to enhance the debugging process. These values can affect build and rebuild speed dramatically.
     */
    devtool?: Devtool;
    /**
     * Allows you to specify the base path for all the assets within your application.
     * @deprecated
     */
    publicPath?: string;
    /**
     * Configuration for customizing webpack report. See `HtmlWebpackPlugin.Options` from `html-webpack-plugin`.
     */
    minifyHTML?: {
      // TODO: Bacon: HtmlWebpackPlugin.Options
      [option: string]: any;
    };
    /**
     * Configuration for enabling webpack report and `stats.json`. See `BundleAnalyzerPlugin.Options` from `webpack-bundle-analyzer`.
     * @deprecated
     */
    report?: {
      // TODO: Bacon: BundleAnalyzerPlugin.Options
      [option: string]: any;
    };
    /**
     * Configuration for customizing the service worker. See `GenerateSWOptions` from `workbox-webpack-plugin`.
     */
    serviceWorker?: {
      // TODO: Bacon: GenerateSWOptions
      [options: string]: any;
    };
  };
  /**
   * Defines the meta tag elements that will be added to the head element of your index.html.
   */
  meta?: {
    [key: string]: any;

    /**
     * ID provided by the Google Site Verification API: https://developers.google.com/site-verification/
     */
    googleSiteVerification?: string;
    /**
     * Apple PWA-specific meta elements. By default these values will be inferred from fields in the scope above, but you can override them here.
     */
    apple?: {
      [key: string]: any;
      /**
       * Enables PWA functionality on iOS devices.
       * @fallback 'yes'
       * @metatag 'apple-mobile-web-app-capable'
       */
      mobileWebAppCapable?: string;

      /**
       * If content is set to default, the status bar appears normal. If set to black, the status bar has a black background. If set to black-translucent, the status bar is black and translucent. If set to default or black, the web content is displayed below the status bar. If set to black-translucent, the web content is displayed on the entire screen, partially obscured by the status bar.
       *
       * @deprecated use web.barStyle instead
       * @fallback black-translucent
       * @metatag apple-mobile-web-app-status-bar-style
       */
      barStyle?: WebAppleBarStyle;
    };

    /**
     * [Twitter card protocol](https://developer.twitter.com/en/docs/tweets/optimize-with-cards/overview/markup.html)
     */
    twitter?: {
      [key: string]: any;
    };
    /**
     * [The Open Graph protocol](http://ogp.me/)
     */
    openGraph?: {
      [key: string]: any;
    };
    /**
     * X-UA protocol
     */
    microsoft?: {
      [key: string]: any;
    };
  };

  /**
   * Experimental features. These will break without deprecation notice.
   */
  dangerous?: {
    [key: string]: any;

    /**
     * Viewport meta tag for your index.html. By default this is optimized for mobile usage, disabling zooming, and resizing for iPhone X.
     */
    viewport?: string;
    /**
     * Message that is rendered when the browser using your page doesn't have JS enabled.
     * @fallback Oh no! It looks like JavaScript is not enabled in your browser.
     */
    noJavaScriptMessage?: string;
  };
  /**
   * Configuration for PWA splash screens.
   */
  splash?: WebSplashScreen;
};

/**
 * Configuration for PWA splash screens.
 */
export type WebSplashScreen = {
  /**
   * Color to fill the loading screen background
   */
  backgroundColor?: Color;
  /**
   * Determines how the `image` will be displayed in the splash loading screen. Must be one of `cover` or `contain`, defaults to `contain`.
   */
  resizeMode?: 'cover' | 'contain';
  /**
   * Local path or remote url to an image to fill the background of the loading screen. Image size and aspect ratio are up to you. Must be a .png.
   */
  image: Image;

  /**
   * Whether your standalone iOS app supports tablet screen sizes. Defaults to `false`.
   */
  supportsTablet?: boolean;
};

export type IosPlatformConfig = {
  /**
   * @autogenerated
   */
  publishSourceMapPath?: string;
  /**
   * The manifest for the Android version of your app will be written to this path during publish.
   * @autogenerated
   */
  publishManifestPath?: string;
  /**
   * The bundle for the Android version of your app will be written to this path during publish.
   * @autogenerated
   */
  publishBundlePath?: string;
  /**
   * The bundle identifier for your iOS standalone app. You make it up, but it needs to be unique on the App Store. See [this StackOverflow question](http://stackoverflow.com/questions/11347470/what-does-bundle-identifier-mean-in-the-ios-project).
   * @pattern ^[a-zA-Z][a-zA-Z0-9\\-\\.]+$
   * @regexHuman "iOS bundle identifier notation unique name for your app. For example, host.exp.exponent, where exp.host is our domain and Expo is our app."
   */
  bundleIdentifier?: string;

  /**
   * Build number for your iOS standalone app. Must be a string that matches Apple's [format for CFBundleVersion](https://developer.apple.com/library/content/documentation/General/Reference/InfoPlistKeyReference/Articles/CoreFoundationKeys.html#//apple_ref/doc/uid/20001431-102364).
   * @pattern ^[A-Za-z0-9\\.]+$
   */
  buildNumber?: string;
  /**
   * Local path or remote URL to an image to use for your app's icon on iOS. If specified, this overrides the top-level `icon` key. Use a 1024x1024 icon which follows Apple's interface guidelines for icons, including color profile and transparency. Expo will generate the other required sizes. This icon will appear on the home screen and within the Expo app.
   */
  icon?: Icon;
  /**
   * Merchant ID for use with Apple Pay in your standalone app.
   */
  merchantId?: string;

  /**
   * URL to your app on the Apple App Store, if you have deployed it there. This is used to link to your store page from your Expo project page if your app is public.
   * @pattern ^https://itunes\\.apple\\.com/.*?\\d+
   * @example https://itunes.apple.com/us/app/expo-client/id982107779
   */
  appStoreUrl?: string;
  config?: {
    /**
     * [Branch](https://branch.io/) key to hook up Branch linking services.
     */
    branch?: {
      /**
       * Your Branch API key
       */
      apiKey: string;
    };
    /**
     * Sets `ITSAppUsesNonExemptEncryption` in the standalone ipa's Info.plist to the given boolean value.
     */
    usesNonExemptEncryption?: boolean;
    /**
     * [Google Maps iOS SDK](https://developers.google.com/maps/documentation/ios-sdk/start) key for your standalone app.
     */
    googleMapsApiKey?: string;
    /**
     * [Google Mobile Ads App ID](https://support.google.com/admob/answer/6232340) Google AdMob App ID.
     */
    googleMobileAdsAppId?: string;
    /**
     * [Google Sign-In iOS SDK](https://developers.google.com/identity/sign-in/ios/start-integrating) keys for your standalone app.
     */
    googleSignIn?: {
      /**
       * The reserved client ID URL scheme. Can be found in `GoogeService-Info.plist`.
       */
      reservedClientId?: string;
    };
  };
  /**
   * [Firebase Configuration File](https://support.google.com/firebase/answer/7015592) GoogleService-Info.plist file for configuring Firebase.
   */
  googleServicesFile?: string;
  /**
   * Whether your standalone iOS app supports tablet screen sizes. Defaults to `false`.
   */
  supportsTablet?: boolean;
  /**
   * If true, indicates that your standalone iOS app does not support handsets, and only supports tablets.
   */
  isTabletOnly?: boolean;
  /**
   * If true, indicates that your standalone iOS app does not support Slide Over and Split View on iPad. Defaults to `true` currently, but will change to `false` in a future SDK version.
   */
  requireFullScreen?: boolean;
  /**
   * Configuration to force the app to always use the light or dark user-interface appearance, such as \"dark mode\", or make it automatically adapt to the system preferences. If not provided, defaults to `light`.
   * @fallback light
   */
  userInterfaceStyle?: 'light' | 'dark' | 'automatic';

  /**
   * Dictionary of arbitrary configuration to add to your standalone app's native Info.plist. Applied prior to all other Expo-specific configuration. No other validation is performed, so use this at your own risk of rejection from the App Store.
   */
  infoPlist?: {
    [key: string]: any;
  };
  /**
   * An array that contains Associated Domains for the standalone app.
   */
  associatedDomains?: string[];
  /**
   * A boolean indicating if the app uses iCloud Storage for DocumentPicker. See DocumentPicker docs for details.
   */
  usesIcloudStorage?: boolean;
  /**
   * A boolean indicating if the app uses Apple Sign-In. See AppleAuthentication docs for details.
   * @fallback false
   */
  usesAppleSignIn?: boolean;
  /**
   * Configuration for loading and splash screen for standalone iOS apps.
   */
  splash?: {
    /**
     * Local path to a XIB file as the loading screen. It overrides other loading screen options.
     * {
     *   "asset": true,
     *   "contentTypePattern": "^text/xml$",
     *   "contentTypeHuman": ".xib interface builder document"
     * }
     */
    xib?: string;
    /**
     * Color to fill the loading screen background
     */
    backgroundColor?: Color;
    /**
     * Determines how the `image` will be displayed in the splash loading screen. Must be one of `cover` or `contain`, defaults to `contain`.
     */
    resizeMode?: SplashResizeMode;

    /**
     * Local path or remote url to an image to fill the background of the loading screen. Image size and aspect ratio are up to you. Must be a .png.
     */
    image: Image;

    /**
     * Local path or remote url to an image to fill the background of the loading screen. Image size and aspect ratio are up to you. Must be a .png.
     */
    tabletImage?: Image;
  };
};

export type ExpoConfig = {
  /**
   * The name of your app as it appears both within Expo and on your home screen as a standalone app.
   */
  name?: string;
  /**
   * A short description of what your app is and why it is great.
   */
  description?: string;
  /**
   * The friendly url name for publishing. eg: `expo.io/@your-username/slug`.
   * @pattern ^[a-zA-Z0-9_\\-]+$
   */
  slug?: string;
  /**
   * The username of the account under which this app is published. If not specified, the app is published as the currently signed-in user.
   */
  owner?: string;
  /**
   * Either `public` or `unlisted`. If not provided, defaults to `unlisted`. In the future `private` will be supported. `unlisted` hides the experience from search results.
   */
  privacy?: ExpoPrivacy;
  /**
   * The Expo sdkVersion to run the project on. This should line up with the version specified in your package.json.
   * @pattern ^(\\d+\\.\\d+\\.\\d+)|(UNVERSIONED)$
   */
  sdkVersion?: string;
  /**
   * Your app version, use whatever versioning scheme that you like.
   */
  version?: string;
  /**
   * Platforms that your project explicitly supports. If not specified, it defaults to `[\"ios\", \"android\"]`.
   */
  platforms?: Platform[];
  /**
   * If you would like to share the source code of your app on Github, enter the URL for the repository here and it will be linked to from your Expo project page.
   * @pattern ^https://github\\.com/
   */
  githubUrl?: string;
  /**
   * Lock your app to a specific orientation with `portrait` or `landscape`. Defaults to no lock.
   */
  orientation?: ExpoOrientation;
  /**
   * On Android, this will determine the color of your app in the multitasker. Currently this is not used on iOS, but it may be used for other purposes in the future.
   */
  primaryColor?: Color;
  /**
   * Local path or remote url to an image to use for your app's icon. We recommend that you use a 1024x1024 png file. This icon will appear on the home screen and within the Expo app.
   */
  icon?: Icon;
  /**
   * Configuration for remote (push) notifications.
   */
  notification?: {
    /**
     * Local path or remote url to an image to use as the icon for push notifications. 96x96 png grayscale with transparency.
     */
    icon?: Icon;
    /**
     * Tint color for the push notification image when it appears in the notification tray.
     */
    color?: Color;
    /**
     * Display the notification when the app is in foreground on iOS.
     */
    iosDisplayInForeground?: boolean;
    /**
     * Show each push notification individually (`default`) or collapse into one (`collapse`).
     */
    androidMode?: AndroidMode;
    /**
     * If `androidMode` is set to `collapse`, this title is used for the collapsed notification message. eg: `'#{unread_notifications} new interactions'`.
     */
    androidCollapsedTitle?: string;
  };
  /**
   * By default, Expo looks for the application registered with the AppRegistry as `main`. If you would like to change this, you can specify the name in this property.
   */
  appKey?: string;
  /**
   * Configuration for the status bar on Android.
   */
  androidStatusBar?: {
    /**
     * Configures the status bar icons to have a light or dark color.
     */
    barStyle?: AndroidBarStyle;
    /**
     * Specifies the background color of the status bar.
     */
    backgroundColor?: Color;
  };
  /**
   * Configuration for the bottom navigation bar on Android.
   */
  androidNavigationBar?: {
    /**
     * Determines how and when the navigation bar is shown.
     */
    visible?: 'leanback' | 'immersive' | 'sticky-immersive' | boolean;
    /**
     * Configure the navigation bar icons to have a light or dark color. Supported on Android Oreo and newer.
     */
    barStyle?: AndroidBarStyle;
    /**
     * Specifies the background color of the navigation bar.
     */
    backgroundColor?: Color;
  };
  /**
   * Adds a notification to your standalone app with refresh button and debug info.
   */
  androidShowExponentNotificationInShellApp?: boolean;
  /**
   * URL scheme to link into your app. For example, if we set this to `'demo'`, then demo:// URLs would open your app when tapped.
   * @pattern ^[a-z][a-z0-9+.-]*$
   * @regexHuman String beginning with a lowercase letter followed by any combination of lowercase letters, digits, \"+\", \".\" or \"-\"
   * @standaloneOnly
   */
  scheme?: string;
  /**
   * The relative path to your main JavaScript file.
   */
  entryPoint?: string;
  /**
   * Any extra fields you want to pass to your experience. Values are accessible via `Expo.Constants.manifest.extra` ([read more](../sdk/constants.html#expoconstantsmanifest))
   */
  extra?: {
    [key: string]: any;
  };
  rnCliPath?: string;
  packagerOpts?: {
    [key: string]: any;
  };
  ignoreNodeModulesValidation?: boolean;
  nodeModulesPath?: string;
  /**
   * Configuration for how and when the app should request OTA JavaScript updates
   */
  updates?: {
    /**
     * If set to false, your standalone app will never download any code, and will only use code bundled locally on the device. In that case, all updates to your app must be submitted through Apple review. Defaults to true. (Note that this will not work out of the box with ExpoKit projects)
     */
    enabled?: boolean;
    /**
     * By default, Expo will check for updates every time the app is loaded. Set this to `'ON_ERROR_RECOVERY'` to disable automatic checking unless recovering from an error.
     */
    checkAutomatically?: 'ON_ERROR_RECOVERY' | 'ON_LOAD';
    /**
     * How long (in ms) to allow for fetching OTA updates before falling back to a cached version of the app. Defaults to 30000 (30 sec).
     * minimum: 0,
     * maximum: 300000
     */
    fallbackToCacheTimeout?: number;
  };
  /**
   * Provide overrides by locale for System Dialog prompts like Permissions Boxes
   */
  locales?: { [key: string]: any };
  /**
   * iOS standalone app specific configuration
   * @standaloneOnly
   */
  ios?: IosPlatformConfig;
  /**
   * Android standalone app specific configuration
   * @standaloneOnly
   */
  android?: AndroidPlatformConfig;
  /**
   * Web platform specific configuration
   */
  web?: WebPlatformConfig;
  /**
   * Used for all Facebook libraries. Set up your Facebook App ID at https://developers.facebook.com.
   * @pattern ^[0-9]+$
   */
  facebookAppId?: string;
  /**
   * Used for native Facebook login.
   */
  facebookDisplayName?: string;
  /**
   * Used for Facebook native login. Starts with 'fb' and followed by a string of digits, like 'fb1234567890'. You can find your scheme at https://developers.facebook.com/docs/facebook-login/ios in the 'Configuring Your info.plist' section.
   */
  facebookScheme?: string;
  /**
   * Is app detached
   * @generated
   */
  isDetached?: boolean;
  /**
   * Extra fields needed by detached apps
   * @generated
   */
  detach?: {
    scheme?: string;
    iosExpoViewUrl?: string;
    androidExpoViewUrl?: string;
    [key: string]: any;
  };
  /**
   * Configuration for loading and splash screen for standalone apps.
   */
  splash?: Splash;
  /**
   * Configuration for scripts to run to hook into the publish process
   */
  hooks?: {
    postPublish?: string[];
  };
  /**
   * An array of file glob strings which point to assets that will be bundled within your standalone app binary. Read more in the [Offline Support guide](https://docs.expo.io/versions/latest/guides/offline-support.html)
   */
  assetBundlePatterns?: string[];
  [key: string]: any;
};
export type ExpRc = { [key: string]: any };
export type Platform = 'android' | 'ios' | 'web';
export type ConfigErrorCode =
  | 'NO_APP_JSON'
  | 'NOT_OBJECT'
  | 'NO_EXPO'
  | 'MODULE_NOT_FOUND'
  | 'INVALID_MODE'
  | 'INVALID_CONFIG';

export type ConfigMode = 'development' | 'production';

export type ConfigContext = {
  projectRoot: string;
  configPath?: string;
  config: Partial<ExpoConfig>;
  mode: ConfigMode;
};

export type GetConfigOptions = {
  mode: ConfigMode;
  configPath?: string;
  skipSDKVersionRequirement?: boolean;
};
