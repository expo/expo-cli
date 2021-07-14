import type Log from '@expo/bunyan';
import { ExpoConfig, getConfigFilePaths } from '@expo/config';
import * as ExpoMetroConfig from '@expo/metro-config';
import {
  createDevServerMiddleware,
  securityHeadersMiddleware,
} from '@react-native-community/cli-server-api';
import bodyParser from 'body-parser';
import type { Server as ConnectServer } from 'connect';
import type http from 'http';
import type Metro from 'metro';
import path from 'path';
import resolveFrom from 'resolve-from';
import semver from 'semver';

import {
  buildHermesBundleAsync,
  isEnableHermesManaged,
  maybeInconsistentEngineAsync,
} from './HermesBundler';
import LogReporter from './LogReporter';
import clientLogsMiddleware from './middleware/clientLogsMiddleware';
import createJsInspectorMiddleware from './middleware/createJsInspectorMiddleware';
import { remoteDevtoolsCorsMiddleware } from './middleware/remoteDevtoolsCorsMiddleware';
import { remoteDevtoolsSecurityHeadersMiddleware } from './middleware/remoteDevtoolsSecurityHeadersMiddleware';
import { replaceMiddlewareWith } from './middleware/replaceMiddlewareWith';

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

  // securityHeadersMiddleware does not support cross-origin requests for remote devtools to get the sourcemap.
  // We replace with the enhanced version.
  replaceMiddlewareWith(
    middleware as ConnectServer,
    securityHeadersMiddleware,
    remoteDevtoolsSecurityHeadersMiddleware
  );
  middleware.use(remoteDevtoolsCorsMiddleware);

  middleware.use(bodyParser.json());
  middleware.use('/logs', clientLogsMiddleware(options.logger));
  middleware.use('/inspector', createJsInspectorMiddleware());

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
