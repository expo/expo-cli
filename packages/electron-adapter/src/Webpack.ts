import { withAlias } from '@expo/webpack-config/addons';
import { createBabelLoaderFromEnvironment } from '@expo/webpack-config/loaders';
import { ExpoDefinePlugin, ExpoInterpolateHtmlPlugin } from '@expo/webpack-config/plugins';
import { getPaths, getConfig, getModuleFileExtensions } from '@expo/webpack-config/env';
import {
  getPluginsByName,
  getRulesByMatchingFiles,
  resolveEntryAsync,
} from '@expo/webpack-config/utils';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import * as path from 'path';
import { Configuration } from 'webpack';

// skipEntry defaults to false
export function withExpoWebpack(
  config: Configuration,
  options: { projectRoot?: string; skipEntry?: boolean } = {}
) {
  // Support React Native aliases
  config = withAlias(config);

  const projectRoot = options.projectRoot || process.cwd();

  const env: any = {
    platform: 'electron',
    projectRoot,
    mode: config.mode === 'production' ? config.mode : 'development',
    locations: getPaths(projectRoot),
  };
  if (!config.plugins) config.plugins = [];
  if (!config.resolve) config.resolve = {};

  env.config = getConfig(env);

  const [plugin] = getPluginsByName(config, 'HtmlWebpackPlugin');
  if (plugin) {
    const { options } = plugin.plugin as any;
    // Replace HTML Webpack Plugin so we can interpolate it
    config.plugins.splice(plugin.index, 1, new HtmlWebpackPlugin(options));
    config.plugins.splice(
      plugin.index + 1,
      0,
      // Add variables to the `index.html`
      ExpoInterpolateHtmlPlugin.fromEnv(env, HtmlWebpackPlugin)
    );
  }

  // Add support for expo-constants
  config.plugins.push(ExpoDefinePlugin.fromEnv(env));

  // Support platform extensions
  config.resolve.extensions = getModuleFileExtensions('electron', 'web');
  config.resolve.extensions.push('.node');

  if (!options.skipEntry) {
    if (!env.locations.appMain) {
      throw new Error(
        `The entry point for your project couldn't be found. Please install \`expo\`, or define it in the package.json main field`
      );
    }

    const electronWebpackDefaultEntryPoints = [
      path.resolve(env.projectRoot, 'index'),
      path.resolve(env.projectRoot, 'app'),
    ];
    const expoEntry = config.entry;
    config.entry = async () => {
      const entries = await resolveEntryAsync(expoEntry);

      const expoEntryPointPath = env.locations.appMain;

      if (entries.renderer && !entries.renderer.includes(expoEntryPointPath)) {
        if (!Array.isArray(entries.renderer)) {
          entries.renderer = [entries.renderer];
        }

        entries.renderer = entries.renderer.filter(
          inputPath =>
            !electronWebpackDefaultEntryPoints.some(possibleEntryPoint =>
              inputPath.includes(possibleEntryPoint)
            )
        );

        entries.renderer.push(expoEntryPointPath);

        if (entries.renderer.length > 2) {
          throw new Error(
            `electron-adapter app entry hack doesn't work with this version of electron-webpack. The expected entry length should be 2, instead got: [${entries.renderer.join(
              ', '
            )}]`
          );
        } else {
          console.log(` Using custom entry point > ${expoEntryPointPath}`);
        }
      }
      return entries;
    };
  }

  const babelConfig = createBabelLoaderFromEnvironment(env);

  // Modify externals https://github.com/electron-userland/electron-webpack/issues/81
  const includeFunc = babelConfig.include as ((path: string) => boolean);
  if (config.externals) {
    config.externals = (config.externals as any)
      .map((external: any) => {
        if (typeof external !== 'function') {
          const relPath = path.join('node_modules', external);
          if (!includeFunc(relPath)) return external;
          return null;
        }
        return (ctx: any, req: any, cb: any) => {
          const relPath = path.join('node_modules', req);
          return includeFunc(relPath) ? cb() : external(ctx, req, cb);
        };
      })
      .filter(Boolean);
  }

  // Replace JS babel loaders with Expo loaders that can handle RN libraries
  const rules = getRulesByMatchingFiles(config, [env.locations.appMain]);

  for (const filename of Object.keys(rules)) {
    for (const loaderItem of rules[filename]) {
      (config.module || { rules: [] }).rules.splice(loaderItem.index, 0, babelConfig);
      return config;
    }
  }

  return config;
}
