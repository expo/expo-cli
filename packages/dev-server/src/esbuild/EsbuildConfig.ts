import Log from '@expo/bunyan';
import { getBareExtensions } from '@expo/config/paths';
import merge from 'deepmerge';
import { BuildOptions } from 'esbuild';
import fs from 'fs-extra';
import path from 'path';
import resolveFrom from 'resolve-from';
import { resolveEntryPoint } from 'xdl/build/tools/resolveEntryPoint';

import { mergePlugins, setAssetLoaders, setPlugins } from './utils';

const assetExts =  ['bmp', 'gif', 'jpg', 'jpeg', 'png', 'psd', 'svg', 'webp', 'm4v', 'mov', 'mp4', 'mpeg', 'mpg', 'webm', 'aac', 'aiff', 'caf', 'm4a', 'mp3',  'wav', 'html', 'pdf', 'yaml', 'yml', 'otf', 'ttf', 'zip', 'db'] //prettier-ignore

const native = {
  target: 'esnext',
  format: 'iife',
  plugins: [
    { name: 'expoLogging' },
    {
      name: 'stripFlowTypes',
      params: [
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
    },
    {
      name: 'reactNativeAssets',
      params: assetExts,
    },
    { name: 'patches' },
  ],
};

const config: { ios: any; android: any; web: any; native: any } = {
  web: {
    target: 'es2020',
    format: 'esm',
    plugins: [
      { name: 'expoLogging' },
      {
        name: 'alias',
        params: {
          // TODO: Dynamic
          'react-native': './node_modules/react-native-web/dist/index.js',
        },
      },
    ],
  },
  native,
  ios: native,
  android: native,
};

async function getBuildOptions(
  projectRoot: string,
  logger: Log,
  {
    platform,
    minify,
    cleanCache,
  }: { platform: keyof typeof config; minify?: boolean; cleanCache?: boolean },
  customConfig?: any
) {
  const filename = resolveEntryPoint(projectRoot, platform);

  const outputPath = path.resolve(`dist/index.${platform}.js`);
  await fs.ensureDir(path.dirname(outputPath));

  const base: BuildOptions = {
    entryPoints: [filename || 'App.js'],
    outfile: outputPath,
    assetNames: 'assets/[name]',
    publicPath: '/',
    minify,
    write: true,
    bundle: true,
    legalComments: 'none',
    sourcemap: true,
    incremental: true,
    logLevel: 'debug',
    mainFields: ['react-native', 'browser', 'module', 'main'],
    define: {
      'process.env.JEST_WORKER_ID': 'false',
      'process.env.NODE_DEV': minify ? '"production"' : '"development"',
      __DEV__: minify ? 'false' : 'true',
      global: 'window',
    },
    loader: { '.js': 'jsx', ...setAssetLoaders(assetExts) },
    resolveExtensions: getBareExtensions([platform, 'native'], {
      isModern: false,
      isTS: true,
      isReact: true,
    }).map(value => '.' + value),
  };

  if (platform !== 'web') {
    if (!base.plugins) {
      base.plugins = [];
    }

    base.plugins.push({
      name: 'alias',
      params: {
        'react-native-vector-icons/': resolveFrom.silent(projectRoot, '@expo/vector-icons'),
      },
    });

    base.inject = [
      resolveRelative(projectRoot, 'react-native/Libraries/polyfills/console.js'),
      resolveRelative(projectRoot, 'react-native/Libraries/polyfills/error-guard.js'),
      resolveRelative(projectRoot, 'react-native/Libraries/polyfills/Object.es7.js'),
      // Sets up React DevTools
      resolveRelative(projectRoot, 'react-native/Libraries/Core/InitializeCore.js'),
    ];
  } else {
    base.inject = [resolveFrom(projectRoot, 'setimmediate/setImmediate.js')];
  }

  const buildOptions: BuildOptions = merge.all([base, config[platform], customConfig]);
  const mergedPlugins = mergePlugins(config[platform].plugins, customConfig?.plugins);
  buildOptions.plugins = setPlugins(projectRoot, logger, mergedPlugins, platform, cleanCache);

  // Append to the top of the bundle
  if (!buildOptions.banner) {
    buildOptions.banner = { js: '' };
  }

  if (platform === 'web' && !minify) {
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

  return { buildOptions, mergedPlugins };
}

function resolveRelative(projectRoot: string, moduleId: string): string {
  const _path = path.relative(projectRoot, resolveFrom(projectRoot, moduleId));
  if (_path.startsWith('.')) return _path;
  return './' + _path;
}

export default getBuildOptions;
