// @ts-ignore: no types
import OriginalWebpackBar from 'webpackbar';

/**
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
