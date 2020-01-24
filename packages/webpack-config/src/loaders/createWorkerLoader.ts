import { Rule } from 'webpack';

export default (): Rule => ({
  // Cannot exclude any node modules yet but in the future we should just target a select few.
  test: /\.worker\.(js|mjs|ts)$/,
  use: { loader: require.resolve('worker-loader') },
});
