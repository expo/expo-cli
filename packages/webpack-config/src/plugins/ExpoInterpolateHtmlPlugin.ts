import InterpolateHtmlPlugin from 'react-dev-utils/InterpolateHtmlPlugin';

import HtmlWebpackPlugin from 'html-webpack-plugin';
import { Environment } from '../types';
import { getConfig, getPublicPaths } from '../env';

export function createNoJSComponent(message: string): string {
  // from twitter.com
  return `" <form action="location.reload()" method="POST" style="background-color:#fff;position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;"><div style="font-size:18px;font-family:Helvetica,sans-serif;line-height:24px;margin:10%;width:80%;"> <p>${message}</p> <p style="margin:20px 0;"> <button type="submit" style="background-color: #4630EB; border-radius: 100px; border: none; box-shadow: none; color: #fff; cursor: pointer; font-weight: bold; line-height: 20px; padding: 6px 16px;">Reload</button> </p> </div> </form> "`;
}

export default class ExpoInterpolateHtmlPlugin extends InterpolateHtmlPlugin {
  static fromEnv = (
    env: Pick<Environment, 'mode' | 'config' | 'locations' | 'projectRoot'>,
    HtmlWebpackPlugin: HtmlWebpackPlugin
  ): ExpoInterpolateHtmlPlugin => {
    const config = env.config || getConfig(env);
    const { publicPath } = getPublicPaths(env);

    const { build: buildConfig = {}, lang } = config.web;
    const { rootId } = buildConfig;
    const { noJavaScriptMessage } = config.web.dangerous;
    const noJSComponent = createNoJSComponent(noJavaScriptMessage);

    // Add variables to the `index.html`
    return new ExpoInterpolateHtmlPlugin(HtmlWebpackPlugin, {
      WEB_PUBLIC_URL: publicPath,
      WEB_TITLE: config.web.name,
      NO_SCRIPT: noJSComponent,
      LANG_ISO_CODE: lang,
      ROOT_ID: rootId,
    });
  };
}
