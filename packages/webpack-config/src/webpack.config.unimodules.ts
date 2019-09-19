/**
 * A bare webpack config that is required for using
 * react-native-web & Unimodules in the browser.
 *
 * This should be used to inject basic support into systems
 * like react-scripts and storybook.
 */

import { createEnvironmentConstants } from '@expo/config';
import webpack from 'webpack';
import ManifestPlugin from 'webpack-manifest-plugin';
import { ExpoDefinePlugin } from './plugins';
// @ts-ignore

import createClientEnvironment from './createClientEnvironment';
import { Arguments, Environment } from './types';
import {
  DEFAULT_ALIAS,
  getModuleFileExtensions,
  overrideWithPropertyOrConfig,
} from './utils/config';
import getMode from './utils/getMode';
import getPathsAsync from './utils/getPathsAsync';

import createFontLoader from './loaders/createFontLoader';
import createBabelLoaderAsync from './loaders/createBabelLoaderAsync';
import getConfigAsync from './utils/getConfigAsync';

// { production, development, mode, projectRoot }
export default async function(env: Environment, argv: Arguments): Promise<webpack.Configuration> {
  const {
    /**
     * **Dangerously** disable, extend, or clobber the default alias.
     *
     * Disable by passing in `alias: false`
     * Clobber with `alias: { ... }` setting existing `DEFAULT_ALIAS` values to `undefined`
     * Extend by defining new values in `alias: { ... }`
     */
    alias: aliasProp,
    publicPath = '/',
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

  const config = expoConfig || (await getConfigAsync(env));
  const alias = overrideWithPropertyOrConfig(aliasProp, DEFAULT_ALIAS, true);

  const locations = await getPathsAsync(env);
  const mode = getMode(env);

  const babelConfig = await createBabelLoaderAsync({
    mode,
    babelProjectRoot: locations.root,
  });

  const publicAppManifest = createEnvironmentConstants(config, locations.production.manifest);

  const environmentVariables = createClientEnvironment(mode, publicPath, publicAppManifest);

  // `publicUrl` is just like `publicPath`, but we will provide it to our app
  // as %WEB_PUBLIC_URL% in `index.html` and `process.env.WEB_PUBLIC_URL` in JavaScript.
  // Omit trailing slash as %WEB_PUBLIC_URL%/xyz looks better than %WEB_PUBLIC_URL%xyz.
  const publicUrl = mode === 'production' ? publicPath.slice(0, -1) : '';

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
