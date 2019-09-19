import { Rule } from 'webpack';
import { FilePaths } from '../types';

function createFontLoader({ locations }: { locations: FilePaths }): Rule {
  return {
    test: /\.(ttf|otf|woff)$/,
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
      locations.root,
      locations.includeModule('react-native-vector-icons'),
      locations.includeModule('@expo/vector-icons'),
    ],
  };
}

export default createFontLoader;
