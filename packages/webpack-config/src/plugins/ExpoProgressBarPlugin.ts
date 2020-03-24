// @ts-ignore: no types
import OriginalWebpackBar from 'webpackbar';

/**
 * Fork of https://github.com/clessg/progress-bar-webpack-plugin
 * but with TypeScript support.
 *
 * @category plugins
 * @internal
 */
export default class WebpackBar extends OriginalWebpackBar {
  constructor() {
    super({
      name: 'Expo Webpack',
      reporters: ['fancy'],
    });
  }
}
