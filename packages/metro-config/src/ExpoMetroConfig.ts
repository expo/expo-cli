import path from 'path';

import { getConfig, resolveModule } from '@expo/config';
import { Reporter } from 'metro';
import { ConfigT, InputConfigT, loadConfig } from 'metro-config';

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

export function getDefaultConfig(projectRoot: string): InputConfigT {
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
  const reactNativePath = resolveModule('react-native', projectRoot, exp);

  return {
    resolver: {
      resolverMainFields: ['react-native', 'browser', 'main'],
      platforms: ['ios', 'android', 'native'],
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
      babelTransformerPath: require.resolve('../transformer'),
      // TODO: Bacon: Add path for web platform
      assetRegistryPath: path.join(reactNativePath, 'Libraries/Image/AssetRegistry'),
      assetPlugins: [resolveModule('expo/tools/hashAssetFiles', projectRoot, exp)],
    },
  };
}

export interface LoadOptions {
  config?: string;
  maxWorkers?: number;
  port?: number;
  reporter?: Reporter;
  resetCache?: boolean;
  // TODO(ville): make this a part of the default config?
  sourceExts?: string[];
}

export async function loadAsync(projectRoot: string, options: LoadOptions = {}): Promise<ConfigT> {
  const defaultConfig = getDefaultConfig(projectRoot);
  return loadConfig({ cwd: projectRoot, projectRoot, ...options }, defaultConfig);
}
