import { getDefaultTarget, ProjectTarget } from '@expo/config';
import { getBareExtensions, getManagedExtensions } from '@expo/config/paths';
import { Reporter } from 'metro';
import type MetroConfig from 'metro-config';
import path from 'path';
import resolveFrom from 'resolve-from';

// Import only the types here, the values will be imported from the project, at runtime.
const INTERNAL_CALLSITES_REGEX = new RegExp(
  [
    '/Libraries/Renderer/implementations/.+\\.js$',
    '/Libraries/BatchedBridge/MessageQueue\\.js$',
    '/Libraries/YellowBox/.+\\.js$',
    '/Libraries/LogBox/.+\\.js$',
    '/Libraries/Core/Timers/.+\\.js$',
    '/node_modules/react-devtools-core/.+\\.js$',
    '/node_modules/react-refresh/.+\\.js$',
    '/node_modules/scheduler/.+\\.js$',
  ].join('|')
);

export interface DefaultConfigOptions {
  target?: ProjectTarget;
}

export function getDefaultConfig(
  projectRoot: string,
  options: DefaultConfigOptions = {}
): MetroConfig.InputConfigT {
  const MetroConfig = importMetroConfigFromProject(projectRoot);

  const reactNativePath = path.dirname(resolveFrom(projectRoot, 'react-native/package.json'));

  let hashAssetFilesPath;
  try {
    hashAssetFilesPath = resolveFrom(projectRoot, 'expo-asset/tools/hashAssetFiles');
  } catch {
    // TODO: we should warn/throw an error if the user has expo-updates installed but does not
    // have hashAssetFiles available, or if the user is in managed workflow and does not have
    // hashAssetFiles available. but in a bare app w/o expo-updates, just using dev-client,
    // it is not needed
  }

  const target = options.target ?? process.env.EXPO_TARGET ?? getDefaultTarget(projectRoot);
  if (!(target === 'managed' || target === 'bare')) {
    throw new Error(
      `Invalid target: '${target}'. Debug info: \n${JSON.stringify(
        {
          'options.target': options.target,
          EXPO_TARGET: process.env.EXPO_TARGET,
          default: getDefaultTarget(projectRoot),
        },
        null,
        2
      )}`
    );
  }
  const sourceExtsConfig = { isTS: true, isReact: true, isModern: false };
  const sourceExts =
    target === 'bare'
      ? getBareExtensions([], sourceExtsConfig)
      : getManagedExtensions([], sourceExtsConfig);

  const metroDefaultValues = MetroConfig.getDefaultConfig.getDefaultValues(projectRoot);
  // Merge in the default config from Metro here, even though loadConfig uses it as defaults.
  // This is a convenience for getDefaultConfig use in metro.config.js, e.g. to modify assetExts.
  return MetroConfig.mergeConfig(metroDefaultValues, {
    resolver: {
      resolverMainFields: ['react-native', 'browser', 'main'],
      platforms: ['ios', 'android', 'native'],
      sourceExts,
    },
    serializer: {
      getModulesRunBeforeMainModule: () => [
        require.resolve(path.join(reactNativePath, 'Libraries/Core/InitializeCore')),
        // TODO: Bacon: load Expo side-effects
      ],
      getPolyfills: () => require(path.join(reactNativePath, 'rn-get-polyfills'))(),
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
      allowOptionalDependencies: true,
      babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
      // TODO: Bacon: Add path for web platform
      assetRegistryPath: path.join(reactNativePath, 'Libraries/Image/AssetRegistry'),
      assetPlugins: hashAssetFilesPath ? [hashAssetFilesPath] : undefined,
    },
  });
}

export interface LoadOptions {
  config?: string;
  maxWorkers?: number;
  port?: number;
  reporter?: Reporter;
  resetCache?: boolean;
  target?: ProjectTarget;
}

export async function loadAsync(
  projectRoot: string,
  { reporter, target, ...metroOptions }: LoadOptions = {}
): Promise<MetroConfig.ConfigT> {
  let defaultConfig = getDefaultConfig(projectRoot, { target });
  if (reporter) {
    defaultConfig = { ...defaultConfig, reporter };
  }
  const MetroConfig = importMetroConfigFromProject(projectRoot);
  return await MetroConfig.loadConfig(
    { cwd: projectRoot, projectRoot, ...metroOptions },
    defaultConfig
  );
}

function importMetroConfigFromProject(projectRoot: string): typeof MetroConfig {
  const resolvedPath = resolveFrom.silent(projectRoot, 'metro-config');
  if (!resolvedPath) {
    throw new Error(
      'Missing package "metro-config" in the project. ' +
        'This usually means `react-native` is not installed. ' +
        'Please verify that dependencies in package.json include "react-native" ' +
        'and run `yarn` or `npm install`.'
    );
  }
  return require(resolvedPath);
}
