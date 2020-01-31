import { Rule } from 'webpack';

/**
 * Create a `Webpack.Rule` for loading fonts and including Expo vector icons.
 * Fonts will be loaded to `./fonts/[name].[ext]`.
 *
 * @param projectRoot root project folder.
 * @param includeModule method for resolving a node module given its package name.
 * @category loaders
 */
export default function createFontLoader(
  projectRoot: string,
  includeModule: (...props: string[]) => string
): Rule {
  return {
    test: /\.(woff2?|eot|ttf|otf)$/,
    use: [
      {
        loader: require.resolve('url-loader'),
        options: {
          limit: 50000,
          name: './fonts/[name].[ext]',
        },
      },
    ],
    include: [
      projectRoot,
      includeModule('react-native-vector-icons'),
      includeModule('@expo/vector-icons'),
    ],
  };
}
