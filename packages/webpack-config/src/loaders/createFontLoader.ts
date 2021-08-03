import Debug from 'debug';
import path from 'path';
import resolveFrom from 'resolve-from';
import { RuleSetRule } from 'webpack';

const debug = Debug('expo:webpack-config:loader:font');

/**
 * Fonts will be loaded to `./fonts/[name].[ext]`.
 *
 * @param projectRoot root project folder.
 * @returns `RuleSetRule` for loading fonts and including Expo vector icons.
 * @category loaders
 */
export default function createFontLoader(projectRoot: string): RuleSetRule {
  const resolveRoot = (moduleId: string, post: string) => {
    const resolved = resolveFrom.silent(projectRoot, moduleId);
    if (resolved) {
      return path.join(resolved, post);
    }
    return null;
  };

  // Add the popular font icons, resolved from the project root (in case the user is in a monorepo)
  const include = [
    projectRoot,
    // `/path/to/node_modules/react-native-vector-icons/`
    resolveRoot('react-native-vector-icons/package.json', '..'),
    // `/path/to/node_modules/@expo/vector-icons/build/`
    resolveRoot('@expo/vector-icons/package.json', '../build'),
  ].filter(Boolean) as string[];

  debug('Include paths:', include);

  return {
    test: /\.(woff2?|eot|ttf|otf)$/,
    use: [
      {
        loader: require.resolve('url-loader'),
        options: {
          // Interop assets like Metro bundler
          esModule: false,
          limit: 50000,
          name: './fonts/[name].[ext]',
        },
      },
    ],
    include,
  };
}
