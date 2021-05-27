import Log from '@expo/bunyan';
import * as ExpoMetroConfig from '@expo/metro-config';
import { createDevServerMiddleware } from '@react-native-community/cli-server-api';
import bodyParser from 'body-parser';
import http from 'http';
import type Metro from 'metro';
import resolveFrom from 'resolve-from';

import { buildHermesBundleAsync, shouldBuildHermesBundleAsync } from './HermesBundler';
import LogReporter from './LogReporter';
import clientLogsMiddleware from './middleware/clientLogsMiddleware';

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
  const Metro = importMetroFromProject(projectRoot);

  const reporter = new LogReporter(options.logger);

  const metroConfig = await ExpoMetroConfig.loadAsync(projectRoot, { reporter, ...options });

  const { middleware, attachToServer } = createDevServerMiddleware({
    port: metroConfig.server.port,
    watchFolders: metroConfig.watchFolders,
  });
  middleware.use(bodyParser.json());
  middleware.use('/logs', clientLogsMiddleware(options.logger));

  const customEnhanceMiddleware = metroConfig.server.enhanceMiddleware;
  // @ts-ignore can't mutate readonly config
  metroConfig.server.enhanceMiddleware = (metroMiddleware: any, server: Metro.Server) => {
    if (customEnhanceMiddleware) {
      metroMiddleware = customEnhanceMiddleware(metroMiddleware, server);
    }
    return middleware.use(metroMiddleware);
  };

  const serverInstance = await Metro.runServer(metroConfig, { hmrEnabled: true });

  const { messageSocket, eventsSocket } = attachToServer(serverInstance);
  reporter.reportEvent = eventsSocket.reportEvent;

  return {
    server: serverInstance,
    middleware,
    messageSocket,
  };
}

let nextBuildID = 0;

// TODO: deprecate options.target
export async function bundleAsync(
  projectRoot: string,
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

  try {
    return await Promise.all(
      bundles.map(async (bundle: BundleOptions) => {
        const bundleOutput = await buildAsync(bundle);
        const shouldBuildHermesBundle = await shouldBuildHermesBundleAsync(
          projectRoot,
          bundle.platform
        );

        if (shouldBuildHermesBundle) {
          options.logger.info({ tag: 'expo' }, `💿 Building hermes bundle for ${bundle.platform}`);
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
      })
    );
  } finally {
    metroServer.end();
  }
}

function importMetroFromProject(projectRoot: string): typeof Metro {
  const resolvedPath = resolveFrom.silent(projectRoot, 'metro');
  if (!resolvedPath) {
    throw new Error(
      'Missing package "metro" in the project at ' +
        projectRoot +
        '. ' +
        'This usually means `react-native` is not installed. ' +
        'Please verify that dependencies in package.json include "react-native" ' +
        'and run `yarn` or `npm install`.'
    );
  }
  return require(resolvedPath);
}

function importMetroServerFromProject(projectRoot: string): typeof Metro.Server {
  const resolvedPath = resolveFrom.silent(projectRoot, 'metro/src/Server');
  if (!resolvedPath) {
    throw new Error(
      'Missing module "metro/src/Server" in the project. ' +
        'This usually means React Native is not installed. ' +
        'Please verify that dependencies in package.json include "react-native" ' +
        'and run `yarn` or `npm install`.'
    );
  }
  return require(resolvedPath);
}
