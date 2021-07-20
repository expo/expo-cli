import { getBareExtensions } from '@expo/config/paths';
import { withUnimodules } from '@expo/webpack-config/addons';
import { AnyConfiguration } from '@expo/webpack-config/webpack/types';

export default function withExpo(nextConfig: any = {}): any {
  return {
    ...nextConfig,
    pageExtensions: getBareExtensions(['web']),
    webpack(config: AnyConfiguration, options: any): AnyConfiguration {
      // Prevent define plugin from overwriting Next.js environment.
      process.env.EXPO_WEBPACK_DEFINE_ENVIRONMENT_AS_KEYS = 'true';

      const webpack5 = (options.config || {}).webpack5;

      const expoConfig = withUnimodules(
        config,
        {
          projectRoot: nextConfig.projectRoot || process.cwd(),
        },
        {
          supportsFontLoading: false,
          webpack5: webpack5 !== false,
        }
      );
      // Use original public path
      (expoConfig.output || {}).publicPath = (config.output || {}).publicPath;

      // TODO: Bacon: use commonjs for RNW babel maybe...
      if (typeof nextConfig.webpack === 'function') {
        return nextConfig.webpack(expoConfig, options);
      }

      return expoConfig;
    },
  };
}
