import { Rule } from 'webpack';

export default (): Rule => ({
  test: /\.worker\.(js|mjs|jsx|ts|tsx)$/,
  use: { loader: require.resolve('worker-loader') },
});
