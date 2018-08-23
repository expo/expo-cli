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

const expoSdkUniversalModules = [
  // versioned modules
  { podName: 'EXGL', libName: 'expo-gl' },
  { podName: 'EXSMS', libName: 'expo-sms' },
  { podName: 'EXCore', libName: 'expo-core' },
  { podName: 'EXFont', libName: 'expo-font' },
  { podName: 'EXPrint', libName: 'expo-print' },
  { podName: 'EXCamera', libName: 'expo-camera' },
  { podName: 'EXSensors', libName: 'expo-sensors' },
  { podName: 'EXLocation', libName: 'expo-location' },
  { podName: 'EXConstants', libName: 'expo-constants' },
  { podName: 'EXFileSystem', libName: 'expo-file-system' },
  { podName: 'EXPermissions', libName: 'expo-permissions' },
  { podName: 'EXSegment', libName: 'expo-analytics-segment' },
  { podName: 'EXMediaLibrary', libName: 'expo-media-library' },
  { podName: 'EXFontInterface', libName: 'expo-font-interface' },
  { podName: 'EXCameraInterface', libName: 'expo-camera-interface' },
  { podName: 'EXSensorsInterface', libName: 'expo-sensors-interface' },
  { podName: 'EXConstantsInterface', libName: 'expo-constants-interface' },
  { podName: 'EXReactNativeAdapter', libName: 'expo-react-native-adapter' },
  { podName: 'EXFileSystemInterface', libName: 'expo-file-system-interface' },
  { podName: 'EXPermissionsInterface', libName: 'expo-permissions-interface' },
  { podName: 'EXImageLoaderInterface', libName: 'expo-image-loader-interface' },
  { podName: 'EXFaceDetectorInterface', libName: 'expo-face-detector-interface' },
  {
    podName: 'EXFaceDetector',
    libName: 'expo-face-detector',
    detachable: false,
  },
  { podName: 'EXBarCodeScannerInterface', libName: 'expo-barcode-scanner-interface' },
  { podName: 'EXBarCodeScanner', libName: 'expo-barcode-scanner' },

  // unversioned modules
  {
    podName: 'EXGL-CPP',
    libName: 'expo-gl-cpp',
    versionable: false,
    config: {
      ios: {
        subdirectory: 'cpp',
      },
    },
  },

  // JS-only modules
  {
    libName: 'expo-asset',
    isNativeModule: false,
  },
  {
    libName: 'expo-module-template',
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
  ({ config, podName, libName, isNativeModule, ...params }) => {
    return {
      podName,
      libName,
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
