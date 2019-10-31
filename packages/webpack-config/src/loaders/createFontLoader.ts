import { Rule } from 'webpack';

function createFontLoader(
  projectRoot: string,
  includeModule: (...props: string[]) => string
): Rule {
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
      projectRoot,
      includeModule('react-native-vector-icons'),
      includeModule('@expo/vector-icons'),
    ],
  };
}

export default createFontLoader;
