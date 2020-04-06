import path from 'path';

import { ProjectTarget, getConfig, getDefaultTargetAsync, resolveModule } from '@expo/config';
import { getBareExtensions, getManagedExtensions } from '@expo/config/paths';
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

export interface DefaultConfigOptions {
  target?: ProjectTarget;
}

export function getDefaultConfig(
  projectRoot: string,
  options: DefaultConfigOptions = {}
): InputConfigT {
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
  const reactNativePath = resolveModule('react-native', projectRoot, exp);

  const target = options.target ?? getDefaultTargetAsync(projectRoot);
  const sourceExtsConfig = { isTS: true, isReact: true, isModern: false };
  const sourceExts =
    target === 'bare'
      ? getBareExtensions([], sourceExtsConfig)
      : getManagedExtensions([], sourceExtsConfig);

  return {
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
  target?: ProjectTarget;
}

export async function loadAsync(
  projectRoot: string,
  { reporter, target, ...metroOptions }: LoadOptions = {}
): Promise<ConfigT> {
  let defaultConfig = getDefaultConfig(projectRoot, { target });
  if (reporter) {
    defaultConfig = { ...defaultConfig, reporter };
  }
  return await loadConfig({ cwd: projectRoot, projectRoot, ...metroOptions }, defaultConfig);
}
