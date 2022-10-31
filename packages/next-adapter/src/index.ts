import type { AnyConfiguration } from '@expo/webpack-config/webpack/types';
import { DefinePlugin } from 'webpack';

export function withExpo(nextConfig: any = {}): any {
  return {
    ...nextConfig,
    webpack(config: AnyConfiguration, options: any): AnyConfiguration {
      // Mix in aliases
      if (!config.resolve) {
        config.resolve = {};
      }

      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        // Alias direct react-native imports to react-native-web
        'react-native$': 'react-native-web',
        // Alias internal react-native modules to react-native-web
        'react-native/Libraries/EventEmitter/RCTDeviceEventEmitter$':
          'react-native-web/dist/vendor/react-native/NativeEventEmitter/RCTDeviceEventEmitter',
        'react-native/Libraries/vendor/emitter/EventEmitter$':
          'react-native-web/dist/vendor/react-native/emitter/EventEmitter',
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

      if (!config.plugins) {
        config.plugins = [];
      }

      // Expose __DEV__ from Metro.
      config.plugins.push(
        new DefinePlugin({
          __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
        })
      );

      // Execute the user-defined webpack config.
      if (typeof nextConfig.webpack === 'function') {
        return nextConfig.webpack(config, options);
      }

      return config;
    },
  };
}
