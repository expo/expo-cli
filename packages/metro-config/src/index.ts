/**
 * Configuration file of Metro.
 */
import { Config } from './types';
import { existsSync } from 'fs-extra';
// @ts-ignore - no typed definition for the package
import { createBlacklist } from 'metro';
// @ts-ignore - no typed definition for the package
import { loadConfig } from 'metro-config';
import path from 'path';

import loadInputConfig from './config';
import findSymlinkedModules from './findSymlinkedModules';
import { readConfigJson, resolveModule, ExpoConfig } from '@expo/config';

function resolveSymlinksForRoots(roots: string[]): string[] {
  return roots.reduce<string[]>(
    (arr, rootPath) => arr.concat(findSymlinkedModules(rootPath, roots)),
    [...roots]
  );
}

function getWatchFolders(): string[] {
  const root = process.env.REACT_NATIVE_APP_ROOT;
  return root ? resolveSymlinksForRoots([path.resolve(root)]) : [];
}

const getBlacklistRE: () => RegExp = () => createBlacklist([/.*\/__fixtures__\/.*/]);

const INTERNAL_CALLSITES_REGEX = new RegExp(
  [
    '/Libraries/Renderer/implementations/.+\\.js$',
    '/Libraries/BatchedBridge/MessageQueue\\.js$',
    '/Libraries/YellowBox/.+\\.js$',
    '/node_modules/react-devtools-core/.+\\.js$',
  ].join('|')
);

export interface MetroConfig {
  resolver: {
    resolverMainFields: string[];
    blacklistRE: RegExp;
    platforms: string[];
    providesModuleNodeModules: string[];
    hasteImplModulePath: string | undefined;
  };
  serializer: {
    getModulesRunBeforeMainModule: () => string[];
    getPolyfills: () => any;
  };
  server: {
    port: number;
    enhanceMiddleware?: Function;
  };
  symbolicator: {
    customizeFrame: (frame: { file: string | null }) => { collapse: boolean };
  };
  transformer: {
    babelTransformerPath: string;
    assetRegistryPath: string;
    assetPlugins?: Array<string>;
  };
  watchFolders: string[];
  reporter?: any;
}

export const getDefaultConfig = (ctx: Config): MetroConfig => {
  const { exp } = readConfigJson(ctx.root, true, true);

  // TODO: Bacon: Use with NODE_ENV=test
  const hasteImplPath = path.join(ctx.reactNativePath, 'jest/hasteImpl.js');
  return {
    resolver: {
      // TODO: Bacon: add support for the module field
      resolverMainFields: ['react-native', 'browser', 'main'],
      blacklistRE: getBlacklistRE(),
      platforms: [...ctx.haste.platforms, 'native'],
      providesModuleNodeModules: ctx.haste.providesModuleNodeModules,
      hasteImplModulePath: existsSync(hasteImplPath) ? hasteImplPath : undefined,
    },
    serializer: {
      getModulesRunBeforeMainModule: () => [
        require.resolve(path.join(ctx.reactNativePath, 'Libraries/Core/InitializeCore')),
        // TODO: Bacon: load Expo side-effects
      ],
      getPolyfills: () => require(path.join(ctx.reactNativePath, 'rn-get-polyfills'))(),
    },
    server: {
      port: Number(process.env.RCT_METRO_PORT) || 8081,
    },
    symbolicator: {
      customizeFrame: (frame: { file: string | null }) => {
        const collapse = Boolean(frame.file && INTERNAL_CALLSITES_REGEX.test(frame.file));
        return { collapse };
      },
    },
    transformer: {
      // TODO: Bacon: Use babel-preset-expo by default to always support web
      babelTransformerPath: resolveModule('metro-react-native-babel-transformer', ctx.root, exp),
      // TODO: Bacon: Add path for web platform
      assetRegistryPath: path.join(ctx.reactNativePath, 'Libraries/Image/AssetRegistry'),
    },
    watchFolders: getWatchFolders(),
  };
};

export interface ConfigOptionsT {
  maxWorkers?: number;
  port?: number;
  resetCache?: boolean;
  watchFolders?: string[];
  sourceExts?: string[];
  customLogReporterPath?: any;
  config?: string;
  assetPlugins?: string[];
}

/**
 * Loads Metro Config and applies `options` on top of the resolved config.
 *
 * This allows the CLI to always overwrite the file settings.
 */
export default async function load(
  projectRoot: string,
  options: ConfigOptionsT = {}
): Promise<MetroConfig> {
  const ctx = loadInputConfig(projectRoot);

  const { exp } = readConfigJson(ctx.root, true, true);

  const defaultConfig = getDefaultConfig(ctx);

  const reporterPath = options.customLogReporterPath || 'metro/src/lib/TerminalReporter';
  const Reporter = require(resolveModule(reporterPath, ctx.root, exp));

  if (Reporter) {
    const localMetroModulePath = resolveModule('metro-core', ctx.root, exp);
    const { Terminal } = require(localMetroModulePath);
    const terminal = new Terminal(process.stdout);
    defaultConfig.reporter = new Reporter(terminal);
  }

  const metroConfig = await loadConfig({ cwd: ctx.root, projectRoot, ...options }, defaultConfig);
  if (options.assetPlugins) {
    metroConfig.transformer.assetPlugins = options.assetPlugins.map((plugin: any) =>
      require.resolve(plugin)
    );
  }

  return metroConfig;
}
