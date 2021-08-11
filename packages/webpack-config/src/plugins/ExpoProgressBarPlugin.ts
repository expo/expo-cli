// @ts-ignore: no types
import OriginalWebpackBar from 'webpackbar';

// TODO: Replace with something that reports to XDL thru expo/bunyan
export default class WebpackBar extends OriginalWebpackBar {
  constructor() {
    super({
      name: 'Expo Webpack',
      reporters: ['fancy'],
    });
  }
}
