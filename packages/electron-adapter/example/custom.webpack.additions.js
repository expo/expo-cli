const { getModuleFileExtensions } = require('../../webpack-config/webpack/utils');
const { ExpoDefinePlugin } = require('../../webpack-config/webpack/plugins');
const InterpolateHtmlPlugin = require('../../../node_modules/react-dev-utils/InterpolateHtmlPlugin');
const HtmlWebpackPlugin = require('../../../node_modules/html-webpack-plugin');
const {
  getPluginsByName,
  getRulesByMatchingFiles,
} = require('../../webpack-config/webpack/utils/loaders');
const createBabelLoader = require('../../webpack-config/webpack/loaders/createBabelLoader').default;
const getConfig = require('../../webpack-config/webpack/utils/getConfig').default;
const { DEFAULT_ALIAS } = require('../../webpack-config/webpack/utils/config');
const { getPaths, getPublicPaths } = require('../../webpack-config/webpack/utils/paths');
const path = require('path');
function createNoJSComponent(message) {
  // from twitter.com
  return `" <form action="location.reload()" method="POST" style="background-color:#fff;position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;"><div style="font-size:18px;font-family:Helvetica,sans-serif;line-height:24px;margin:10%;width:80%;"> <p>${message}</p> <p style="margin:20px 0;"> <button type="submit" style="background-color: #4630EB; border-radius: 100px; border: none; box-shadow: none; color: #fff; cursor: pointer; font-weight: bold; line-height: 20px; padding: 6px 16px;">Reload</button> </p> </div> </form> "`;
}

// const { getModuleFileExtensions } = require('@expo/webpack-config/webpack/utils');
module.exports = function(config) {
  const env = { projectRoot: __dirname, mode: config.mode };
  const locations = getPaths(env.projectRoot);
  const appConfig = getConfig(env);

  const { build: buildConfig = {}, lang } = appConfig.web;
  const { rootId, babel: babelAppConfig = {} } = buildConfig;
  const { noJavaScriptMessage } = appConfig.web.dangerous;
  const noJSComponent = createNoJSComponent(noJavaScriptMessage);
  const { publicUrl } = getPublicPaths(env);

  const [plugin] = getPluginsByName(config, 'HtmlWebpackPlugin');
  if (plugin) {
    const options = plugin.plugin.options;
    // Replace HTML Webpack Plugin so we can interpolate it
    config.plugins.splice(plugin.index, 1, new HtmlWebpackPlugin(options));
    config.plugins.splice(
      plugin.index + 1,
      0,
      // Add variables to the `index.html`
      new InterpolateHtmlPlugin(HtmlWebpackPlugin, {
        WEB_PUBLIC_URL: publicUrl,
        WEB_TITLE: appConfig.web.name,
        NO_SCRIPT: noJSComponent,
        LANG_ISO_CODE: lang,
        ROOT_ID: rootId,
      })
    );
    // console.log(config.plugins);
  }

  config.plugins.push(
    new ExpoDefinePlugin({
      mode: env.mode,
      publicUrl,
      config: appConfig,
      productionManifestPath: locations.production.manifest,
    })
  );

  if (!config.resolve) config.resolve = {};
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    ...DEFAULT_ALIAS,
  };
  config.resolve.extensions = getModuleFileExtensions('electron', 'web');
  config.resolve.extensions.push('.node');

  const rules = getRulesByMatchingFiles(config, [path.resolve(env.projectRoot, 'foo.js')]);

  // Replace JS babel loaders with Expo loaders that can handle RN libraries
  (() => {
    for (const filename of Object.keys(rules)) {
      for (const loaderItem of rules[filename]) {
        const babelProjectRoot = babelAppConfig.root || locations.root;
        const babelConfig = createBabelLoader({
          mode: config.mode,
          platform: 'electron',
          babelProjectRoot,
          verbose: babelAppConfig.verbose,
          include: babelAppConfig.include,
          useCustom: true,
          use: babelAppConfig.use,
        });
        config.module.rules.splice(loaderItem.index, 1, babelConfig);
        return;
      }
    }
  })();

  return config;
};
