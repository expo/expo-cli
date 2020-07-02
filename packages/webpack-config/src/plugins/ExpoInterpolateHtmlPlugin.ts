import OriginalInterpolateHtmlPlugin from 'react-dev-utils/InterpolateHtmlPlugin';

import HtmlWebpackPlugin from 'html-webpack-plugin';
import { Environment } from '../types';
import { getConfig, getPublicPaths } from '../env';

/**
 * Add variables to the `index.html`.
 *
 * @category plugins
 */
export default class InterpolateHtmlPlugin extends OriginalInterpolateHtmlPlugin {
  static fromEnv = (
    env: Pick<Environment, 'mode' | 'config' | 'locations' | 'projectRoot'>,
    HtmlWebpackPlugin: HtmlWebpackPlugin
  ): InterpolateHtmlPlugin => {
    const config = env.config || getConfig(env);
    const { publicPath } = getPublicPaths(env);

    // @ts-ignore
    return new InterpolateHtmlPlugin(HtmlWebpackPlugin, {
      WEB_PUBLIC_URL: publicPath,
      // @ts-ignore Type 'string | undefined' is not assignable to type 'string'.
      WEB_TITLE: config.web?.name,
      LANG_ISO_CODE: config.web?.lang,
      // These are for legacy ejected web/index.html files
      NO_SCRIPT: `<form action="" style="background-color:#fff;position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;"><div style="font-size:18px;font-family:Helvetica,sans-serif;line-height:24px;margin:10%;width:80%;"> <p>Oh no! It looks like JavaScript is not enabled in your browser.</p> <p style="margin:20px 0;"> <button type="submit" style="background-color: #4630EB; border-radius: 100px; border: none; box-shadow: none; color: #fff; cursor: pointer; font-weight: bold; line-height: 20px; padding: 6px 16px;">Reload</button> </p> </div> </form>`,
      ROOT_ID: 'root',
    });
  };
}
