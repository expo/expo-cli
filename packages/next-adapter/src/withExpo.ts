import { getManagedExtensions } from '@expo/config/paths';
import { withUnimodules } from '@expo/webpack-config/addons';
import { imageLoaderRule } from '@expo/webpack-config/loaders';
// @ts-ignore
import withImages from 'next-images';
// @ts-ignore
import withFonts from 'next-fonts';

const withExpo = (nextConfig: any = {}): any => ({
  ...nextConfig,
  pageExtensions: getManagedExtensions(['web']),
  webpack(config: any, options: any): any {
    const expoConfig = withUnimodules(
      config,
      {
        projectRoot: nextConfig.projectRoot || process.cwd(),
      },
      { supportsFontLoading: true }
    );
    // Use original public path
    (expoConfig.output || {}).publicPath = (config.output || {}).publicPath;

    // Support image loading
    expoConfig.module!.rules!.push(imageLoaderRule);

    // TODO: Bacon: use commonjs for RNW babel maybe...
    if (typeof nextConfig.webpack === 'function') {
      return nextConfig.webpack(expoConfig, options);
    }

    return expoConfig;
  },
});

export default (nextConfig: any = {}): any => {
  // Add support for static images and fonts by default
  return withImages(withFonts(withExpo(nextConfig)));
};
