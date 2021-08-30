import type Log from '@expo/bunyan';
import { ExpoConfig, getConfigFilePaths } from '@expo/config';
import * as ExpoMetroConfig from '@expo/metro-config';
import type { Server as ConnectServer } from 'connect';
import http from 'http';
import type Metro from 'metro';
import path from 'path';
import semver from 'semver';

import {
  buildHermesBundleAsync,
  isEnableHermesManaged,
  maybeInconsistentEngineAsync,
} from './HermesBundler';
import LogReporter from './LogReporter';
import { createDevServerAsync } from './metro/createDevServerAsync';
import {
  importInspectorProxyServerFromProject,
  importMetroFromProject,
  importMetroServerFromProject,
} from './metro/importMetroFromProject';
import { createDevServerMiddleware } from './middleware/devServerMiddleware';

export type MetroDevServerOptions = ExpoMetroConfig.LoadOptions & {
  logger: Log;
  quiet?: boolean;
};
export type BundleOptions = {
  entryPoint: string;
  platform: 'android' | 'ios' | 'web';
  dev?: boolean;
  minify?: boolean;
  sourceMapUrl?: string;
};
export type BundleAssetWithFileHashes = Metro.AssetData & {
  fileHashes: string[]; // added by the hashAssets asset plugin
};
export type BundleOutput = {
  code: string;
  map: string;
  hermesBytecodeBundle?: Uint8Array;
  hermesSourcemap?: string;
  assets: readonly BundleAssetWithFileHashes[];
};
export type MessageSocket = {
  broadcast: (method: string, params?: Record<string, any> | undefined) => void;
};

export async function runMetroDevServerAsync(
  projectRoot: string,
  options: MetroDevServerOptions
): Promise<{
  server: http.Server;
  middleware: any;
  messageSocket: MessageSocket;
}> {
  const reporter = new LogReporter(options.logger);

  const metroConfig = await ExpoMetroConfig.loadAsync(projectRoot, { reporter, ...options });

  const { middleware, attachToServer } = createDevServerMiddleware({
    port: metroConfig.server.port,
    watchFolders: metroConfig.watchFolders,
    logger: options.logger,
  });

  const customEnhanceMiddleware = metroConfig.server.enhanceMiddleware;
  // @ts-ignore can't mutate readonly config
  metroConfig.server.enhanceMiddleware = (metroMiddleware: any, server: Metro.Server) => {
    if (customEnhanceMiddleware) {
      metroMiddleware = customEnhanceMiddleware(metroMiddleware, server);
    }
    return middleware.use(metroMiddleware);
  };

  const { server } = await createDevServerAsync(projectRoot, {
    config: metroConfig,
    logger: options.logger,
  });

  const { messageSocket, eventsSocket } = attachToServer(server);
  reporter.reportEvent = eventsSocket.reportEvent;

  return {
    server,
    middleware,
    messageSocket,
  };
}

let nextBuildID = 0;

// TODO: deprecate options.target
export async function bundleAsync(
  projectRoot: string,
  expoConfig: ExpoConfig,
  options: MetroDevServerOptions,
  bundles: BundleOptions[]
): Promise<BundleOutput[]> {
  const metro = importMetroFromProject(projectRoot);
  const Server = importMetroServerFromProject(projectRoot);

  const reporter = new LogReporter(options.logger);
  const config = await ExpoMetroConfig.loadAsync(projectRoot, { reporter, ...options });
  const buildID = `bundle_${nextBuildID++}`;

  const metroServer = await metro.runMetro(config, {
    watch: false,
  });

  const buildAsync = async (bundle: BundleOptions): Promise<BundleOutput> => {
    const bundleOptions: Metro.BundleOptions = {
      ...Server.DEFAULT_BUNDLE_OPTIONS,
      bundleType: 'bundle',
      platform: bundle.platform,
      entryFile: bundle.entryPoint,
      dev: bundle.dev ?? false,
      minify: bundle.minify ?? !bundle.dev,
      inlineSourceMap: false,
      sourceMapUrl: bundle.sourceMapUrl,
      createModuleIdFactory: config.serializer.createModuleIdFactory,
      onProgress: (transformedFileCount: number, totalFileCount: number) => {
        if (!options.quiet) {
          reporter.update({
            buildID,
            type: 'bundle_transform_progressed',
            transformedFileCount,
            totalFileCount,
          });
        }
      },
    };
    reporter.update({
      buildID,
      type: 'bundle_build_started',
      bundleDetails: {
        bundleType: bundleOptions.bundleType,
        platform: bundle.platform,
        entryFile: bundle.entryPoint,
        dev: bundle.dev ?? false,
        minify: bundle.minify ?? false,
      },
    });
    const { code, map } = await metroServer.build(bundleOptions);
    const assets = (await metroServer.getAssets(
      bundleOptions
    )) as readonly BundleAssetWithFileHashes[];
    reporter.update({
      buildID,
      type: 'bundle_build_done',
    });
    return { code, map, assets };
  };

  const maybeAddHermesBundleAsync = async (
    bundle: BundleOptions,
    bundleOutput: BundleOutput
  ): Promise<BundleOutput> => {
    if (!gteSdkVersion(expoConfig, '42.0.0')) {
      return bundleOutput;
    }
    const isHermesManaged = isEnableHermesManaged(expoConfig, bundle.platform);

    const maybeInconsistentEngine = await maybeInconsistentEngineAsync(
      projectRoot,
      bundle.platform,
      isHermesManaged
    );
    if (maybeInconsistentEngine) {
      const platform = bundle.platform === 'ios' ? 'iOS' : 'Android';
      const paths = getConfigFilePaths(projectRoot);
      const configFilePath = paths.dynamicConfigPath ?? paths.staticConfigPath ?? 'app.json';
      const configFileName = path.basename(configFilePath);
      throw new Error(
        `JavaScript engine configuration is inconsistent between ${configFileName} and ${platform} native project.\n` +
          `In ${configFileName}: Hermes is ${isHermesManaged ? 'enabled' : 'not enabled'}\n` +
          `In ${platform} native project: Hermes is ${
            isHermesManaged ? 'not enabled' : 'enabled'
          }\n` +
          `Please check the following files for inconsistencies:\n` +
          `  - ${configFilePath}\n` +
          `  - ${path.join(projectRoot, 'android', 'gradle.properties')}\n` +
          `  - ${path.join(projectRoot, 'android', 'app', 'build.gradle')}\n` +
          'Learn more: https://expo.fyi/hermes-android-config'
      );
    }

    if (isHermesManaged) {
      options.logger.info(
        { tag: 'expo' },
        `💿 Building Hermes bytecode for the bundle - platform[${bundle.platform}]`
      );
      const hermesBundleOutput = await buildHermesBundleAsync(
        projectRoot,
        bundleOutput.code,
        bundleOutput.map,
        bundle.minify
      );
      bundleOutput.hermesBytecodeBundle = hermesBundleOutput.hbc;
      bundleOutput.hermesSourcemap = hermesBundleOutput.sourcemap;
    }

    return bundleOutput;
  };

  try {
    return await Promise.all(
      bundles.map(async (bundle: BundleOptions) => {
        const bundleOutput = await buildAsync(bundle);
        return maybeAddHermesBundleAsync(bundle, bundleOutput);
      })
    );
  } finally {
    metroServer.end();
  }
}

// Cloned from xdl/src/Versions.ts, we cannot use that because of circular dependency
function gteSdkVersion(expJson: Pick<ExpoConfig, 'sdkVersion'>, sdkVersion: string): boolean {
  if (!expJson.sdkVersion) {
    return false;
  }

  if (expJson.sdkVersion === 'UNVERSIONED') {
    return true;
  }

  try {
    return semver.gte(expJson.sdkVersion, sdkVersion);
  } catch (e) {
    throw new Error(`${expJson.sdkVersion} is not a valid version. Must be in the form of x.y.z`);
  }
}

export function connectInspectorProxy(
  projectRoot: string,
  { server, connect }: { server: http.Server; connect: ConnectServer }
) {
  const { InspectorProxy } = importInspectorProxyServerFromProject(projectRoot);
  const inspectorProxy = new InspectorProxy(projectRoot);
  if ('addWebSocketListener' in inspectorProxy) {
    // metro@0.59.0
    inspectorProxy.addWebSocketListener(server);
  } else if ('createWebSocketListeners' in inspectorProxy) {
    // metro@0.66.0
    // TODO: This isn't properly support without a ws router.
    inspectorProxy.createWebSocketListeners(server);
  }
  // TODO(hypuk): Refactor inspectorProxy.processRequest into separate request handlers
  // so that we could provide routes (/json/list and /json/version) here.
  // Currently this causes Metro to give warning about T31407894.
  // $FlowFixMe[method-unbinding] added when improving typing for this parameters
  connect.use(inspectorProxy.processRequest.bind(inspectorProxy));
}

export { LogReporter, createDevServerMiddleware };
