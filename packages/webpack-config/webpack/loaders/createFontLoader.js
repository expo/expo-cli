module.exports = function createFontLoader({ locations }) {
  return {
    test: /\.(ttf|otf|woff)$/,
    use: [
      {
        loader: 'url-loader',
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
};
