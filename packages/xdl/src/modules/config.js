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
  { podName: 'EXGL', libName: 'expo-gl', sdkVersions: '>=29.0.0' },
  { podName: 'EXSMS', libName: 'expo-sms', sdkVersions: '>=29.0.0' },
  { podName: 'EXCore', libName: 'expo-core', sdkVersions: '>=29.0.0' },
  { podName: 'EXFont', libName: 'expo-font', sdkVersions: '>=30.0.0' },
  { podName: 'EXPrint', libName: 'expo-print', sdkVersions: '>=30.0.0' },
  { podName: 'EXCamera', libName: 'expo-camera', sdkVersions: '>=29.0.0' },
  { podName: 'EXSensors', libName: 'expo-sensors', sdkVersions: '>=29.0.0' },
  { podName: 'EXLocation', libName: 'expo-location', sdkVersions: '>=30.0.0' },
  { podName: 'EXConstants', libName: 'expo-constants', sdkVersions: '>=29.0.0' },
  { podName: 'EXFileSystem', libName: 'expo-file-system', sdkVersions: '>=29.0.0' },
  { podName: 'EXPermissions', libName: 'expo-permissions', sdkVersions: '>=29.0.0' },
  { podName: 'EXSegment', libName: 'expo-analytics-segment', sdkVersions: '>=30.0.0' },
  { podName: 'EXMediaLibrary', libName: 'expo-media-library', sdkVersions: '>=30.0.0' },
  { podName: 'EXFontInterface', libName: 'expo-font-interface', sdkVersions: '>=30.0.0' },
  { podName: 'EXCameraInterface', libName: 'expo-camera-interface', sdkVersions: '>=29.0.0' },
  { podName: 'EXSensorsInterface', libName: 'expo-sensors-interface', sdkVersions: '>=29.0.0' },
  { podName: 'EXConstantsInterface', libName: 'expo-constants-interface', sdkVersions: '>=29.0.0' },
  {
    podName: 'EXReactNativeAdapter',
    libName: 'expo-react-native-adapter',
    sdkVersions: '>=29.0.0',
  },
  {
    podName: 'EXFileSystemInterface',
    libName: 'expo-file-system-interface',
    sdkVersions: '>=29.0.0',
  },
  {
    podName: 'EXPermissionsInterface',
    libName: 'expo-permissions-interface',
    sdkVersions: '>=29.0.0',
  },
  {
    podName: 'EXImageLoaderInterface',
    libName: 'expo-image-loader-interface',
    sdkVersions: '>=30.0.0',
  },
  {
    podName: 'EXFaceDetectorInterface',
    libName: 'expo-face-detector-interface',
    sdkVersions: '>=29.0.0',
  },
  {
    podName: 'EXFaceDetector',
    libName: 'expo-face-detector',
    detachable: false,
    sdkVersions: '>=29.0.0',
  },
  {
    podName: 'EXBarCodeScannerInterface',
    libName: 'expo-barcode-scanner-interface',
    sdkVersions: '>=30.0.0',
  },
  { podName: 'EXBarCodeScanner', libName: 'expo-barcode-scanner', sdkVersions: '>=30.0.0' },

  // unversioned modules
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
