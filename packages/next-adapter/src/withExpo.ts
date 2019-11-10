import { getManagedExtensions } from '@expo/config/build/paths';
import { withUnimodules } from '@expo/webpack-config/webpack/extensions';

export default (nextConfig: any = {}): any => ({
  ...nextConfig,
  pageExtensions: getManagedExtensions(['web']),
  webpack(config: any, options: any): any {
    const expoConfig = withUnimodules(config, {
      projectRoot: nextConfig.projectRoot || process.cwd(),
    });
    // Use original public path
    (expoConfig.output || {}).publicPath = (config.output || {}).publicPath;

    // TODO: Bacon: use commonjs for RNW babel maybe...

    if (typeof nextConfig.webpack === 'function') {
      return nextConfig.webpack(expoConfig, options);
    }

    return expoConfig;
  },
});
