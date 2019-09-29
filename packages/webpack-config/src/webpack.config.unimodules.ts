/**
 * A bare webpack config that is required for using
 * react-native-web & Unimodules in the browser.
 *
 * This should be used to inject basic support into systems
 * like react-scripts and storybook.
 */
import { Configuration } from 'webpack';
import ManifestPlugin from 'webpack-manifest-plugin';

import createBabelLoader from './loaders/createBabelLoader';
import createFontLoader from './loaders/createFontLoader';
import { ExpoDefinePlugin } from './plugins';
import { Arguments, DevConfiguration, Environment } from './types';

import { DEFAULT_ALIAS, getModuleFileExtensions } from './utils';

import { overrideWithPropertyOrConfig } from './utils/config';
import getConfig from './utils/getConfig';
import getMode from './utils/getMode';
import { getPaths, getPublicPaths } from './utils/paths';

// { production, development, mode, projectRoot }
export default function(env: Environment, argv: Arguments): DevConfiguration | Configuration {
  const {
    /**
     * **Dangerously** disable, extend, or clobber the default alias.
     *
     * Disable by passing in `alias: false`
     * Clobber with `alias: { ... }` setting existing `DEFAULT_ALIAS` values to `undefined`
     * Extend by defining new values in `alias: { ... }`
     */
    alias: aliasProp,
    /**
     * The project's `app.json`
     * This will be used to populate the `Constants.manifest` in the Unimodule `expo-constants`
     */
    expoConfig,
    /**
     * **Dangerously** disable the default font loading configuration.
     * If you are merging `webpack.config.unimodules` with another less flexible config,
     * you may want to disable font loading in favor of a manually defined loader.
     *
     * If you do this, be sure to include `@expo/vector-icons` & `react-native-vector-icons`
     * otherwise icons won't work as expected.
     */
    supportsFontLoading = true,
  } = argv;

  const config = expoConfig || getConfig(env);
  const alias = overrideWithPropertyOrConfig(aliasProp, DEFAULT_ALIAS, true);

  const locations = env.locations || getPaths(env.projectRoot);
  const mode = getMode(env);

  const babelConfig = createBabelLoader({
    mode,
    babelProjectRoot: locations.root,
  });

  const { publicPath, publicUrl } = getPublicPaths(env);

  const loaders = [
    {
      test: /\.html$/,
      use: ['html-loader'],
      exclude: locations.template.folder,
    },
    // Process application JS with Babel.
    babelConfig,
  ];

  if (supportsFontLoading) {
    const fontLoaderConfiguration = createFontLoader({ locations });
    loaders.push(fontLoaderConfiguration);
  }

  return {
    // TODO: Bacon: It would be good not to define mode here. We currently need to for the env variables.
    mode,
    // configures where the build ends up
    output: {
      // This is the URL that app is served from.
      // We use "/" in development.
      publicPath,
    },
    plugins: [
      // Generate a manifest file which contains a mapping of all asset filenames
      // to their corresponding output file so that tools can pick it up without
      // having to parse `index.html`.
      new ManifestPlugin({
        fileName: 'asset-manifest.json',
        publicPath,
      }),
      new ExpoDefinePlugin({
        mode,
        publicUrl,
        config,
        productionManifestPath: locations.production.manifest,
      }),
    ],
    module: {
      strictExportPresence: false,

      rules: loaders,
    },
    resolve: {
      symlinks: false,
      alias,
      extensions: getModuleFileExtensions('web'),
    },
  };
}
