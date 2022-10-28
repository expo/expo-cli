import { getBareExtensions } from '@expo/config/paths';
import { ExpoDefinePlugin } from '@expo/webpack-config/plugins';
import { AnyConfiguration } from '@expo/webpack-config/webpack/types';
import { getConfigForPWA } from 'expo-pwa';

export function withExpo({ projectRoot = process.cwd(), ...nextConfig }: any = {}): any {
  return {
    ...nextConfig,
    pageExtensions: getBareExtensions(['web']),
    webpack(config: AnyConfiguration, options: any): AnyConfiguration {
      // Prevent define plugin from overwriting Next.js environment.
      process.env.EXPO_WEBPACK_DEFINE_ENVIRONMENT_AS_KEYS = 'true';

      // Mix in aliases
      if (!config.resolve) config.resolve = {};
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        // Alias direct react-native imports to react-native-web
        'react-native$': 'react-native-web',
        // Alias internal react-native modules to react-native-web
        'react-native/Libraries/Components/View/ViewStylePropTypes$':
          'react-native-web/dist/exports/View/ViewStylePropTypes',
        'react-native/Libraries/EventEmitter/RCTDeviceEventEmitter$':
          'react-native-web/dist/vendor/react-native/NativeEventEmitter/RCTDeviceEventEmitter',
        'react-native/Libraries/vendor/emitter/EventEmitter$':
          'react-native-web/dist/vendor/react-native/emitter/EventEmitter',
        'react-native/Libraries/vendor/emitter/EventSubscriptionVendor$':
          'react-native-web/dist/vendor/react-native/emitter/EventSubscriptionVendor',
        'react-native/Libraries/EventEmitter/NativeEventEmitter$':
          'react-native-web/dist/vendor/react-native/NativeEventEmitter',
      };

      config.resolve.extensions = [
        '.web.js',
        '.web.jsx',
        '.web.ts',
        '.web.tsx',
        ...(config.resolve?.extensions ?? []),
      ];

      if (!config.plugins) config.plugins = [];

      config.plugins.push(
        // Used for surfacing information related to constants
        new ExpoDefinePlugin({
          mode: config.mode ?? 'development',
          publicUrl: config.output?.publicPath ?? '/',
          config: getConfigForPWA(projectRoot),
        })
      );

      if (typeof nextConfig.webpack === 'function') {
        return nextConfig.webpack(config, options);
      }

      return config;
    },
  };
}
