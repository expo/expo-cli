import path from 'path';
// @ts-ignore - no typed definition for the package
import { createBlacklist } from 'metro';
// @ts-ignore - no typed definition for the package
import { loadConfig } from 'metro-config';

import { readConfigJson, resolveModule } from '@expo/config';
import resolveReactNativePath from './config/resolveReactNativePath';

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
    hasteImplModulePath?: string;
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

export function getDefaultConfig(projectRoot: string, options: ConfigOptionsT): MetroConfig {
  const { exp } = readConfigJson(projectRoot, true, true);
  const reactNativePath = resolveReactNativePath(projectRoot);

  return {
    resolver: {
      resolverMainFields: ['react-native', 'browser', 'main'],
      blacklistRE: createBlacklist([/.*\/__fixtures__\/.*/]),
      platforms: ['ios', 'android', 'native'],
      providesModuleNodeModules: ['react-native'],
    },
    serializer: {
      getModulesRunBeforeMainModule: () => [
        require.resolve(path.join(reactNativePath, 'Libraries/Core/InitializeCore')),
        // TODO: Bacon: load Expo side-effects
      ],
      getPolyfills: () => require(path.join(reactNativePath, 'rn-get-polyfills'))(),
    },
    server: { port: options.port || 8081 },
    symbolicator: {
      customizeFrame: (frame: { file: string | null }) => {
        const collapse = Boolean(frame.file && INTERNAL_CALLSITES_REGEX.test(frame.file));
        return { collapse };
      },
    },
    transformer: {
      // TODO: Bacon: Use babel-preset-expo by default to always support web
      babelTransformerPath: resolveModule('metro-react-native-babel-transformer', projectRoot, exp),
      // TODO: Bacon: Add path for web platform
      assetRegistryPath: path.join(reactNativePath, 'Libraries/Image/AssetRegistry'),
      // TODO: Ville: Check if an absolute path is needed here.
      assetPlugins: [resolveModule('expo/tools/hashAssetFiles', projectRoot, exp)],
    },
    watchFolders: [projectRoot],
  };
}

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
export async function load(
  projectRoot: string,
  options: ConfigOptionsT = {}
): Promise<MetroConfig> {
  const defaultConfig = getDefaultConfig(projectRoot, options);
  return loadConfig({ cwd: projectRoot, projectRoot, ...options }, defaultConfig);
}
