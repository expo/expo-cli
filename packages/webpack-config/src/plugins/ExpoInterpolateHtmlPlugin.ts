/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @borrows https://github.com/facebook/create-react-app/blob/f0a837c1f07ebd963ddbba2c2937d04fc1b79d40/packages/react-dev-utils/InterpolateHtmlPlugin.js
 */

// Extracted to ensure the `html-webpack-plugin` was always the same.

import escapeStringRegexp from 'escape-string-regexp';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { Compiler } from 'webpack';

import { getConfig, getPublicPaths } from '../env';
import { Environment } from '../types';

export default class InterpolateHtmlPlugin {
  static fromEnv = (
    env: Pick<Environment, 'mode' | 'config' | 'locations' | 'projectRoot'>,
    htmlWebpackPlugin: typeof HtmlWebpackPlugin
  ): InterpolateHtmlPlugin => {
    const config = env.config || getConfig(env);
    const { publicPath } = getPublicPaths(env);

    // @ts-ignore
    return new InterpolateHtmlPlugin(htmlWebpackPlugin, {
      WEB_PUBLIC_URL: publicPath,
      // @ts-ignore Type 'string | undefined' is not assignable to type 'string'.
      WEB_TITLE: config.web?.name,
      LANG_ISO_CODE: config.web?.lang,
      // These are for legacy ejected web/index.html files
      NO_SCRIPT: `<form action="" style="background-color:#fff;position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;"><div style="font-size:18px;font-family:Helvetica,sans-serif;line-height:24px;margin:10%;width:80%;"> <p>Oh no! It looks like JavaScript is not enabled in your browser.</p> <p style="margin:20px 0;"> <button type="submit" style="background-color: #4630EB; border-radius: 100px; border: none; box-shadow: none; color: #fff; cursor: pointer; font-weight: bold; line-height: 20px; padding: 6px 16px;">Reload</button> </p> </div> </form>`,
      ROOT_ID: 'root',
    });
  };

  constructor(
    public htmlWebpackPlugin: HtmlWebpackPlugin,
    public replacements: Record<string, string>
  ) {}

  apply(compiler: Compiler) {
    const logger = compiler.getInfrastructureLogger('interpolate-html-plugin');

    compiler.hooks.compilation.tap('InterpolateHtmlPlugin', compilation => {
      this.htmlWebpackPlugin
        // @ts-ignore
        .getHooks(compilation)
        .afterTemplateExecution.tap('InterpolateHtmlPlugin', (data: any) => {
          // Run HTML through a series of user-specified string replacements.
          Object.keys(this.replacements).forEach(key => {
            const value = this.replacements[key];
            logger.debug(`Replace: "${key}" with: ${value}`);
            data.html = data.html.replace(
              new RegExp('%' + escapeStringRegexp(key) + '%', 'g'),
              value
            );
          });
        });
    });
  }
}
