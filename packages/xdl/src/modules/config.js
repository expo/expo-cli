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

const expoSdkUniversalModules = [
  // native modules
  {
    podName: 'EXAdsAdMob',
    libName: 'expo-ads-admob',
    sdkVersions: '>=30.0.0',
  },
  {
    podName: 'EXBarCodeScanner',
    libName: 'expo-barcode-scanner',
    sdkVersions: '>=30.0.0',
  },
  {
    podName: 'EXBarCodeScannerInterface',
    libName: 'expo-barcode-scanner-interface',
    sdkVersions: '>=30.0.0',
  },
  {
    podName: 'EXCamera',
    libName: 'expo-camera',
    sdkVersions: '>=29.0.0',
  },
  {
    podName: 'EXCameraInterface',
    libName: 'expo-camera-interface',
    sdkVersions: '>=29.0.0',
  },
  {
    podName: 'EXConstants',
    libName: 'expo-constants',
    sdkVersions: '>=29.0.0',
  },
  {
    podName: 'EXConstantsInterface',
    libName: 'expo-constants-interface',
    sdkVersions: '>=29.0.0',
  },
  {
    podName: 'EXContacts',
    libName: 'expo-contacts',
    sdkVersions: '>=30.0.0',
  },
  {
    podName: 'EXCore',
    libName: 'expo-core',
    sdkVersions: '>=29.0.0',
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
    sdkVersions: '>=29.0.0',
  },
  {
    podName: 'EXFileSystem',
    libName: 'expo-file-system',
    sdkVersions: '>=29.0.0',
  },
  {
    podName: 'EXFileSystemInterface',
    libName: 'expo-file-system-interface',
    sdkVersions: '>=29.0.0',
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
    config: firebaseModuleConfig 
  },
  {
    podName: 'EXFont',
    libName: 'expo-font',
    sdkVersions: '>=30.0.0',
  },
  {
    podName: 'EXFontInterface',
    libName: 'expo-font-interface',
    sdkVersions: '>=30.0.0',
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
    podName: 'EXImageLoaderInterface',
    libName: 'expo-image-loader-interface',
    sdkVersions: '>=30.0.0',
  },
  {
    podName: 'EXLocalAuthentication',
    libName: 'expo-local-authentication',
    sdkVersions: '>=30.0.0',
  },
  {
    podName: 'EXLocation',
    libName: 'expo-location',
    sdkVersions: '>=30.0.0',
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
    sdkVersions: '>=29.0.0',
  },
  {
    podName: 'EXPrint',
    libName: 'expo-print',
    sdkVersions: '>=30.0.0',
  },
  {
    podName: 'EXReactNativeAdapter',
    libName: 'expo-react-native-adapter',
    sdkVersions: '>=29.0.0',
  },
  {
    podName: 'EXSegment',
    libName: 'expo-analytics-segment',
    sdkVersions: '>=30.0.0',
  },
  {
    podName: 'EXSensors',
    libName: 'expo-sensors',
    sdkVersions: '>=29.0.0',
  },
  {
    podName: 'EXSensorsInterface',
    libName: 'expo-sensors-interface',
    sdkVersions: '>=29.0.0',
  },
  {
    podName: 'EXSMS',
    libName: 'expo-sms',
    sdkVersions: '>=29.0.0',
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
];

function defaults(defaultConfig, ...customConfigs) {
  const config = { ...defaultConfig };
  for (const customConfig of customConfigs) {
    if (customConfig) {
      Object.assign(config, customConfig || {});
    }
  }
  return config;
}

const expoSdkUniversalModulesConfigs = expoSdkUniversalModules.map(
  ({ config, podName, libName, sdkVersions, isNativeModule, ...params }) => {
    return {
      podName,
      libName,
      sdkVersions,
      isNativeModule: isNativeModule == null ? true : isNativeModule,
      config: {
        ios: defaults(defaultUniversalModuleConfig.ios, params, config && config.ios),
        android: defaults(defaultUniversalModuleConfig.android, params, config && config.android),
      },
    };
  }
);

module.exports = {
  expoSdkUniversalModulesConfigs,
};
