// @ts-ignore
import { withUnimodules } from '@expo/webpack-config/extensions';
// @ts-ignore
import { getModuleFileExtensionsWithoutDotPrefix } from '@expo/webpack-config/utils';

export default (nextConfig: any = {}): any => ({
  ...nextConfig,
  pageExtensions: getModuleFileExtensionsWithoutDotPrefix('web'),
  webpack(config: any, options: any): any {
    config = withUnimodules(config, {
      projectRoot: nextConfig.projectRoot || process.cwd(),
    });

    if (typeof nextConfig.webpack === 'function') {
      return nextConfig.webpack(config, options);
    }

    return config;
  },
});
