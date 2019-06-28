export type ModuleConfig = {
  podName?: string;
  libName: string;
  sdkVersions: string;
  isNativeModule: boolean;
  config: {
    android: NativeConfig;
    ios: NativeConfig;
  };
};

export type NativeConfig = {
  subdirectory: string;
  versionable: boolean;
  detachable: boolean;
  includeInExpoClient: boolean;
};

const defaultUniversalModuleConfig = {
  ios: {
    // subdirectory in which the module podspec is placed.
    subdirectory: 'ios',
    // whether when adding a new version of ABI
    // the module should be versioned and released
    // as eg. ABI28_0_0EXCamera
    versionable: true,
    // whether the module should be included in the newly created detached app.
    detachable: true,
    // whether the module should be included in Expo Client
    includeInExpoClient: true,
  },
  android: {
    // subdirectory in which the Android project can be found.
    subdirectory: 'android',
    // whether when adding a new version of ABI
    // the module should be versioned and released
    // as eg. abi28_2_0.expo.modules.camera
    versionable: true,
    // whether the module should be included in the newly created detached app,
    // so when releasing a new version of expoview
    // as eg. host.exp.exponent:expoview:28.2.0 the module will
    // be assembled and uploaded to the local maven repo
    detachable: true,
    // whether the module should be included in Expo Client
    includeInExpoClient: true,
  },
};

const firebaseModuleConfig = {
  ios: {
    versionable: false,
    detachable: false,
    includeInExpoClient: false,
  },
  android: {
    versionable: false,
    detachable: false,
    includeInExpoClient: false,
  },
};

const expoUniversalModules = [
  // native modules
  {
    podName: 'EXAdsAdMob',
    libName: 'expo-ads-admob',
    sdkVersions: '>=30.0.0',
  },
  {
    podName: 'EXAdsFacebook',
    libName: 'expo-ads-facebook',
    sdkVersions: '>=33.0.0',
  },
  {
    podName: 'EXAmplitude',
    libName: 'expo-analytics-amplitude',
    sdkVersions: '>=33.0.0',
  },
  {
    podName: 'EXSegment',
    libName: 'expo-analytics-segment',
    sdkVersions: '>=30.0.0',
  },
  {
    podName: 'EXAppAuth',
    libName: 'expo-app-auth',
    sdkVersions: '>=32.0.0',
  },
  {
    podName: 'EXAppLoaderProvider',
    libName: 'expo-app-loader-provider',
    sdkVersions: '>=32.0.0',
  },
  {
    podName: 'EXAV',
    libName: 'expo-av',
    sdkVersions: '>=33.0.0',
  },
  {
    podName: 'EXBackgroundFetch',
    libName: 'expo-background-fetch',
    sdkVersions: '>=32.0.0',
  },
  {
    podName: 'EXBarCodeScanner',
    libName: 'expo-barcode-scanner',
    sdkVersions: '>=30.0.0',
  },
  {
    podName: 'EXBarCodeScannerInterface',
    libName: 'expo-barcode-scanner-interface',
    sdkVersions: '>=30.0.0 <33.0.0',
  },
  {
    podName: 'EXBattery',
    libName: 'expo-battery',
    sdkVersions: '>=34.0.0',
  },
  {
    podName: 'EXBlur',
    libName: 'expo-blur',
    sdkVersions: '>=33.0.0',
    config: {
      android: {
        versionable: false,
        detachable: false,
        includeInExpoClient: false,
      },
    },
  },
  {
    podName: 'EXBrightness',
    libName: 'expo-brightness',
    sdkVersions: '>=33.0.0',
  },
  {
    podName: 'EXCalendar',
    libName: 'expo-calendar',
    sdkVersions: '>=33.0.0',
  },
  {
    podName: 'EXCamera',
    libName: 'expo-camera',
    sdkVersions: '>=29.0.0',
  },
  {
    podName: 'EXCameraInterface',
    libName: 'expo-camera-interface',
    sdkVersions: '>=29.0.0 <33.0.0',
  },
  {
    podName: 'EXConstants',
    libName: 'expo-constants',
    sdkVersions: '>=29.0.0',
  },
  {
    podName: 'EXConstantsInterface',
    libName: 'expo-constants-interface',
    sdkVersions: '>=29.0.0 <33.0.0',
  },
  {
    podName: 'EXContacts',
    libName: 'expo-contacts',
    sdkVersions: '>=30.0.0',
  },
  {
    podName: 'EXCore',
    libName: 'expo-core',
    sdkVersions: '>=29.0.0 <33.0.0',
  },
  {
    podName: 'EXCrypto',
    libName: 'expo-crypto',
    sdkVersions: '>=33.0.0',
  },
  {
    podName: 'EXDevice',
    libName: 'expo-device',
    sdkVersions: '>=34.0.0',
  },
  {
    podName: 'EXDocumentPicker',
    libName: 'expo-document-picker',
    sdkVersions: '>=33.0.0',
  },
  {
    podName: 'EXErrors',
    libName: 'expo-errors',
    sdkVersions: '>=32.0.0 <33.0.0',
  },
  {
    podName: 'EXFacebook',
    libName: 'expo-facebook',
    sdkVersions: '>=33.0.0',
  },
  {
    podName: 'EXFaceDetector',
    libName: 'expo-face-detector',
    detachable: false,
    sdkVersions: '>=29.0.0',
  },
  {
    podName: 'EXFaceDetectorInterface',
    libName: 'expo-face-detector-interface',
    sdkVersions: '>=29.0.0 <33.0.0',
  },
  {
    podName: 'EXFileSystem',
    libName: 'expo-file-system',
    sdkVersions: '>=29.0.0',
  },
  {
    podName: 'EXFileSystemInterface',
    libName: 'expo-file-system-interface',
    sdkVersions: '>=29.0.0 <33.0.0',
  },
  {
    podName: 'EXFirebaseAnalytics',
    libName: 'expo-firebase-analytics',
    sdkVersions: '>=31.0.0',
    config: firebaseModuleConfig,
  },
  {
    podName: 'EXFirebaseApp',
    libName: 'expo-firebase-app',
    sdkVersions: '>=31.0.0',
    config: firebaseModuleConfig,
  },
  {
    podName: 'EXFirebaseAuth',
    libName: 'expo-firebase-auth',
    sdkVersions: '>=31.0.0',
    config: firebaseModuleConfig,
  },
  {
    podName: 'EXFirebaseCrashlytics',
    libName: 'expo-firebase-crashlytics',
    sdkVersions: '>=31.0.0',
    config: firebaseModuleConfig,
  },
  {
    podName: 'EXFirebaseDatabase',
    libName: 'expo-firebase-database',
    sdkVersions: '>=31.0.0',
    config: firebaseModuleConfig,
  },
  {
    podName: 'EXFirebaseFirestore',
    libName: 'expo-firebase-firestore',
    sdkVersions: '>=31.0.0',
    config: firebaseModuleConfig,
  },
  {
    podName: 'EXFirebaseFunctions',
    libName: 'expo-firebase-functions',
    sdkVersions: '>=31.0.0',
    config: firebaseModuleConfig,
  },
  {
    podName: 'EXFirebaseInstanceID',
    libName: 'expo-firebase-instance-id',
    sdkVersions: '>=31.0.0',
    config: firebaseModuleConfig,
  },
  {
    podName: 'EXFirebaseInvites',
    libName: 'expo-firebase-invites',
    sdkVersions: '>=31.0.0',
    config: firebaseModuleConfig,
  },
  {
    podName: 'EXFirebaseLinks',
    libName: 'expo-firebase-links',
    sdkVersions: '>=31.0.0',
    config: firebaseModuleConfig,
  },
  {
    podName: 'EXFirebaseMessaging',
    libName: 'expo-firebase-messaging',
    sdkVersions: '>=31.0.0',
    config: firebaseModuleConfig,
  },
  {
    podName: 'EXFirebaseNotifications',
    libName: 'expo-firebase-notifications',
    sdkVersions: '>=31.0.0',
    config: firebaseModuleConfig,
  },
  {
    podName: 'EXFirebasePerformance',
    libName: 'expo-firebase-performance',
    sdkVersions: '>=31.0.0',
    config: firebaseModuleConfig,
  },
  {
    podName: 'EXFirebaseRemoteConfig',
    libName: 'expo-firebase-remote-config',
    sdkVersions: '>=31.0.0',
    config: firebaseModuleConfig,
  },
  {
    podName: 'EXFirebaseStorage',
    libName: 'expo-firebase-storage',
    sdkVersions: '>=31.0.0',
    config: firebaseModuleConfig,
  },
  {
    podName: 'EXFont',
    libName: 'expo-font',
    sdkVersions: '>=30.0.0',
  },
  {
    podName: 'EXFontInterface',
    libName: 'expo-font-interface',
    sdkVersions: '>=30.0.0 <33.0.0',
  },
  {
    podName: 'EXGL',
    libName: 'expo-gl',
    sdkVersions: '>=29.0.0',
  },
  {
    podName: 'EXGL-CPP',
    libName: 'expo-gl-cpp',
    sdkVersions: '>=29.0.0',
    versionable: false,
    config: {
      ios: {
        subdirectory: 'cpp',
      },
    },
  },
  {
    podName: 'EXGoogleSignIn',
    libName: 'expo-google-sign-in',
    sdkVersions: '>=32.0.0',
  },
  {
    podName: 'EXHaptics',
    libName: 'expo-haptics',
    sdkVersions: '>=33.0.0',
  },
  {
    podName: 'EXImageLoaderInterface',
    libName: 'expo-image-loader-interface',
    sdkVersions: '>=30.0.0 <33.0.0',
  },
  {
    podName: 'EXImageManipulator',
    libName: 'expo-image-manipulator',
    sdkVersions: '>=33.0.0',
  },
  {
    podName: 'EXImagePicker',
    libName: 'expo-image-picker',
    sdkVersions: '>=33.0.0',
  },
  {
    podName: 'EXInAppPurchases',
    libName: 'expo-in-app-purchases',
    sdkVersions: '>=33.0.0',
    config: {
      ios: {
        includeInExpoClient: false,
      },
      android: {
        includeInExpoClient: false,
      },
    },
  },
  {
    libName: 'expo-intent-launcher',
    sdkVersions: '>=33.0.0',
    config: {
      ios: {
        versionable: false,
        detachable: false,
        includeInExpoClient: false,
      },
    },
  },
  {
    podName: 'EXKeepAwake',
    libName: 'expo-keep-awake',
    sdkVersions: '>=33.0.0',
  },
  {
    podName: 'EXLinearGradient',
    libName: 'expo-linear-gradient',
    sdkVersions: '>=33.0.0',
  },
  {
    podName: 'EXLocalAuthentication',
    libName: 'expo-local-authentication',
    sdkVersions: '>=30.0.0',
  },
  {
    podName: 'EXLocalization',
    libName: 'expo-localization',
    sdkVersions: '>=31.0.0',
  },
  {
    podName: 'EXLocation',
    libName: 'expo-location',
    sdkVersions: '>=30.0.0',
  },
  {
    podName: 'EXMailComposer',
    libName: 'expo-mail-composer',
    sdkVersions: '>=33.0.0',
  },
  {
    podName: 'EXMediaLibrary',
    libName: 'expo-media-library',
    sdkVersions: '>=30.0.0',
  },
  {
    podName: 'EXPaymentsStripe',
    libName: 'expo-payments-stripe',
    sdkVersions: '>=30.0.0',
    detachable: false,
    config: {
      ios: {
        includeInExpoClient: false,
      },
    },
  },
  {
    podName: 'EXPermissions',
    libName: 'expo-permissions',
    sdkVersions: '>=29.0.0',
  },
  {
    podName: 'EXPermissionsInterface',
    libName: 'expo-permissions-interface',
    sdkVersions: '>=29.0.0 <33.0.0',
  },
  {
    podName: 'EXPrint',
    libName: 'expo-print',
    sdkVersions: '>=30.0.0',
  },
  {
    podName: 'EXRandom',
    libName: 'expo-random',
    sdkVersions: '>=33.0.0',
  },
  {
    podName: 'EXReactNativeAdapter',
    libName: 'expo-react-native-adapter',
    sdkVersions: '>=29.0.0 <33.0.0',
  },
  {
    podName: 'EXSecureStore',
    libName: 'expo-secure-store',
    sdkVersions: '>=33.0.0',
  },
  {
    podName: 'EXSensors',
    libName: 'expo-sensors',
    sdkVersions: '>=29.0.0',
  },
  {
    podName: 'EXSensorsInterface',
    libName: 'expo-sensors-interface',
    sdkVersions: '>=29.0.0 <33.0.0',
  },
  {
    podName: 'EXSharing',
    libName: 'expo-sharing',
    sdkVersions: '>=33.0.0',
  },
  {
    podName: 'EXSMS',
    libName: 'expo-sms',
    sdkVersions: '>=29.0.0',
  },
  {
    podName: 'EXSpeech',
    libName: 'expo-speech',
    sdkVersions: '>=33.0.0',
  },
  {
    podName: 'EXSQLite',
    libName: 'expo-sqlite',
    sdkVersions: '>=33.0.0',
  },
  {
    podName: 'EXTaskManager',
    libName: 'expo-task-manager',
    sdkVersions: '>=32.0.0',
  },
  {
    podName: 'EXTaskManagerInterface',
    libName: 'expo-task-manager-interface',
    sdkVersions: '>=32.0.0 <33.0.0',
    config: {
      android: {
        versionable: false,
      },
    },
  },
  {
    podName: 'EXVideoThumbnails',
    libName: 'expo-video-thumbnails',
    sdkVersions: '>=33.0.0',
  },
  {
    podName: 'EXWebBrowser',
    libName: 'expo-web-browser',
    sdkVersions: '>=33.0.0',
  },

  // JS-only modules
  {
    libName: 'expo-asset',
    sdkVersions: '>=29.0.0',
    isNativeModule: false,
  },
  {
    libName: 'expo-module-template',
    sdkVersions: '>=29.0.0',
    isNativeModule: false,
  },
  {
    podName: 'UMCore',
    libName: '@unimodules/core',
    sdkVersions: '>=33.0.0',
  },
  {
    podName: 'UMReactNativeAdapter',
    libName: '@unimodules/react-native-adapter',
    sdkVersions: '>=33.0.0',
  },
  {
    podName: 'UMBarCodeScannerInterface',
    libName: 'unimodules-barcode-scanner-interface',
    sdkVersions: '>=33.0.0',
  },
  {
    podName: 'UMCameraInterface',
    libName: 'unimodules-camera-interface',
    sdkVersions: '>=33.0.0',
  },
  {
    podName: 'UMConstantsInterface',
    libName: 'unimodules-constants-interface',
    sdkVersions: '>=33.0.0',
  },
  {
    podName: 'UMFaceDetectorInterface',
    libName: 'unimodules-face-detector-interface',
    sdkVersions: '>=33.0.0',
  },
  {
    podName: 'UMFileSystemInterface',
    libName: 'unimodules-file-system-interface',
    sdkVersions: '>=33.0.0',
  },
  {
    podName: 'UMFontInterface',
    libName: 'unimodules-font-interface',
    sdkVersions: '>=33.0.0',
  },
  {
    podName: 'UMImageLoaderInterface',
    libName: 'unimodules-image-loader-interface',
    sdkVersions: '>=33.0.0',
  },
  {
    podName: 'UMPermissionsInterface',
    libName: 'unimodules-permissions-interface',
    sdkVersions: '>=33.0.0',
  },
  {
    podName: 'UMSensorsInterface',
    libName: 'unimodules-sensors-interface',
    sdkVersions: '>=33.0.0',
  },
  {
    podName: 'UMTaskManagerInterface',
    libName: 'unimodules-task-manager-interface',
    sdkVersions: '>=33.0.0',
    config: {
      android: {
        versionable: false,
      },
    },
  },
];

export const vendoredNativeModules = [
  { libName: '@expo/vector-icons', sdkVersions: '>=26.0.0', isNativeModule: true },
  { libName: '@react-native-community/netinfo', sdkVersions: '>=33.0.0', isNativeModule: true },
  { libName: 'lottie-react-native', sdkVersions: '>=26.0.0', isNativeModule: true },
  { libName: 'react-native-branch', sdkVersions: '>=26.0.0', isNativeModule: true },
  { libName: 'react-native-gesture-handler', sdkVersions: '>=26.0.0', isNativeModule: true },
  { libName: 'react-native-maps', sdkVersions: '>=26.0.0', isNativeModule: true },
  { libName: 'react-native-reanimated', sdkVersions: '>=28.0.0', isNativeModule: true },
  { libName: 'react-native-screens', sdkVersions: '>=30.0.0', isNativeModule: true },
  { libName: 'react-native-svg', sdkVersions: '>=26.0.0', isNativeModule: true },
  { libName: 'react-native-view-shot', sdkVersions: '>=26.0.0', isNativeModule: true },
  { libName: 'react-native-webview', sdkVersions: '>=33.0.0', isNativeModule: true },
];

function defaults(
  defaultConfig: NativeConfig,
  ...customConfigs: (Partial<NativeConfig> | undefined)[]
) {
  return Object.assign({}, defaultConfig, ...customConfigs);
}

export const expoSdkUniversalModulesConfigs: ModuleConfig[] = expoUniversalModules.map(
  ({ config = {}, podName, libName, sdkVersions, isNativeModule = true, ...params }) => {
    return {
      podName,
      libName,
      sdkVersions,
      isNativeModule,
      config: {
        ios: defaults(
          defaultUniversalModuleConfig.ios,
          params,
          'ios' in config ? config.ios : undefined
        ),
        android: defaults(
          defaultUniversalModuleConfig.android,
          params,
          'android' in config ? config.android : undefined
        ),
      },
    };
  }
);
