import path from 'path';

import {
  ProjectTarget,
  getConfig,
  getDefaultTarget,
  projectHasModule,
  resolveModule,
} from '@expo/config';
import { getBareExtensions, getManagedExtensions } from '@expo/config/paths';
import { Reporter } from 'metro';
// Import only the types here, the values will be imported from the project, at runtime.
import type MetroConfig from 'metro-config';

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
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
  const MetroConfig = importMetroConfigFromProject(projectRoot);

  const reactNativePath = path.dirname(
    resolveModule('react-native/package.json', projectRoot, exp)
  );

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
    symbolicator: {
      customizeFrame: (frame: { file: string | null }) => {
        const collapse = Boolean(frame.file && INTERNAL_CALLSITES_REGEX.test(frame.file));
        return { collapse };
      },
    },
    transformer: {
      babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
      // TODO: Bacon: Add path for web platform
      assetRegistryPath: path.join(reactNativePath, 'Libraries/Image/AssetRegistry'),
      assetPlugins: [resolveModule('expo/tools/hashAssetFiles', projectRoot, exp)],
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
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });

  const resolvedPath = projectHasModule('metro-config', projectRoot, exp);
  if (!resolvedPath) {
    throw new Error(
      'Missing package "metro-config" in the project. ' +
        'This usually means React Native is not installed. ' +
        'Please verify that dependencies in package.json include "react-native" ' +
        'and run `yarn` or `npm install`.'
    );
  }
  return require(resolvedPath);
}
