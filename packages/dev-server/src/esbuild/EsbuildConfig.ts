import Log from '@expo/bunyan';
import { getBareExtensions } from '@expo/config/paths';
import { BuildOptions } from 'esbuild';
import fs from 'fs';
import path from 'path';
import resolveFrom from 'resolve-from';
import { resolveEntryPoint } from 'xdl/build/tools/resolveEntryPoint';

import {
  getAssetExtensions,
  getBundleEnvironment,
  getMainFields,
  isDebug,
} from './bundlerSettings';
import aliasPlugin from './plugins/aliasPlugin';
import loggingPlugin from './plugins/loggingPlugin';
import patchPlugin from './plugins/patchPlugin';
import reactNativeAssetsPlugin from './plugins/reactNativeAssetsPlugin';
import stripFlowTypesPlugin from './plugins/stripFlowTypesPlugin';

function setAssetLoaders(assetExts: string[]) {
  return assetExts.reduce<Record<string, string>>(
    (loaders, ext) => ({ ...loaders, ['.' + ext]: 'file' }),
    {}
  );
}

export function loadConfig(
  projectRoot: string,
  {
    logger,
    platform,
    isDev,
    cleanCache,
    config,
  }: {
    logger: Log;
    platform: 'ios' | 'android' | 'web';
    isDev: boolean;
    cleanCache?: boolean;
    config?: Partial<BuildOptions>;
  }
) {
  const distFolder = path.resolve(projectRoot, `dist`);
  const outputPath = path.resolve(`dist/index.${platform}.js`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const assetExtensions = getAssetExtensions();
  const buildOptions: BuildOptions = {
    ...(config || {}),
    entryPoints: [resolveEntryPoint(projectRoot, platform)],
    outfile: outputPath,
    assetNames: 'assets/[name]',
    publicPath: '/',
    minify: !isDev,
    write: true,
    bundle: true,
    // For now, remove all comments so the client can download the bundle faster.
    legalComments: isDev ? 'none' : 'eof',
    // This helps the source maps be located in the correct place.
    // Without it, tapping the stack traces will open to the wrong place.
    sourceRoot: distFolder,
    sourcemap: true,
    incremental: true,
    logLevel: isDebug ? 'verbose' : 'debug',
    mainFields: getMainFields(platform),
    define: getBundleEnvironment({ isDev }),
    loader: { '.js': 'jsx', ...setAssetLoaders(assetExtensions) },
  };
  if (!buildOptions.plugins) {
    buildOptions.plugins = [];
  }

  if (platform !== 'web') {
    buildOptions.target = 'esnext';
    buildOptions.format = 'iife';

    buildOptions.resolveExtensions = getBareExtensions([platform, 'native'], {
      isModern: false,
      isTS: true,
      isReact: true,
    }).map(value => '.' + value);

    buildOptions.plugins.push(
      stripFlowTypesPlugin(
        projectRoot,
        [
          'react-native',
          '@react-native-community/masked-view',
          'expo-asset-utils',
          '@react-native-picker/picker',
          '@react-native-segmented-control/segmented-control',
          '@react-native-community/datetimepicker',
          '@react-native-async-storage/async-storage',
          'react-native-view-shot',
          'react-native-gesture-handler',
          '@react-native-community/toolbar-android',
          '@react-native/normalize-color',
          '@react-native/assets',
          '@react-native/polyfills',
        ],
        cleanCache
      ),
      loggingPlugin(logger),
      reactNativeAssetsPlugin(projectRoot, platform, assetExtensions),
      patchPlugin(),
      aliasPlugin({
        // TODO: Make this interface more like { 'react-native-vector-icons': '@expo/vector-icons' }
        // TODO: Make optional
        'react-native-vector-icons/': resolveFrom(projectRoot, '@expo/vector-icons'),
      })
    );

    buildOptions.inject = [
      resolveRelative(projectRoot, 'react-native/Libraries/polyfills/console.js'),
      resolveRelative(projectRoot, 'react-native/Libraries/polyfills/error-guard.js'),
      resolveRelative(projectRoot, 'react-native/Libraries/polyfills/Object.es7.js'),
      // Sets up React DevTools
      resolveRelative(projectRoot, 'react-native/Libraries/Core/InitializeCore.js'),
    ];
  } else {
    buildOptions.target = 'es2020';
    buildOptions.format = 'esm';

    buildOptions.resolveExtensions = getBareExtensions([platform], {
      isModern: false,
      isTS: true,
      isReact: true,
    }).map(value => '.' + value);

    buildOptions.plugins.push(
      loggingPlugin(logger),
      aliasPlugin({
        'react-native-vector-icons/': resolveFrom(projectRoot, '@expo/vector-icons'),
      })
    );

    buildOptions.inject = [resolveFrom(projectRoot, 'setimmediate/setImmediate.js')];
  }

  // Append to the top of the bundle
  if (!buildOptions.banner) {
    buildOptions.banner = { js: '' };
  }

  if (platform === 'web' && isDev) {
    buildOptions.banner.js =
      `(() => new EventSource("/esbuild").onmessage = () => location.reload())();\n` +
      buildOptions.banner.js;
  }
  if (platform !== 'web') {
    if (!buildOptions.banner.js) {
      buildOptions.banner.js = ``;
    }
    buildOptions.banner.js += `\nvar __BUNDLE_START_TIME__=this.nativePerformanceNow?nativePerformanceNow():Date.now();
var window = typeof globalThis !== 'undefined' ? globalThis : typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : this;`;
  }

  return buildOptions;
}

function resolveRelative(projectRoot: string, moduleId: string): string {
  const _path = path.relative(projectRoot, resolveFrom(projectRoot, moduleId));
  if (_path.startsWith('.')) return _path;
  return './' + _path;
}
