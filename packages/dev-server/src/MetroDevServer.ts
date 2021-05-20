import Log from '@expo/bunyan';
import * as ExpoMetroConfig from '@expo/metro-config';
import {
  createDevServerMiddleware,
  securityHeadersMiddleware,
} from '@react-native-community/cli-server-api';
import bodyParser from 'body-parser';
import type { Server as ConnectServer, HandleFunction } from 'connect';
import http from 'http';
import type { IncomingMessage, ServerResponse } from 'http';
import type Metro from 'metro';
import resolveFrom from 'resolve-from';
import { URL } from 'url';

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

  replaceCliSecurityHeaderMiddleware(middleware as ConnectServer);
  middleware.use(remoteDevtoolsCorsMiddleware);

  middleware.use(bodyParser.json());
  middleware.use('/logs', clientLogsMiddleware(options.logger));

  const pluginMiddlewares = importPluginMiddlewares(projectRoot);
  pluginMiddlewares.forEach(handler => middleware.use(handler));

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
    return await Promise.all(bundles.map((bundle: BundleOptions) => buildAsync(bundle)));
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

function importPluginMiddlewares(projectRoot: string): HandleFunction[] {
  const supportedPlugins = ['@expo/dev-plugin-inspector'];
  const middlewares: HandleFunction[] = [];
  for (const module of supportedPlugins) {
    const resolvePath = resolveFrom.silent(projectRoot, `${module}/build/middleware`);
    if (!resolvePath) {
      continue;
    }
    const middlewareCreator = require(resolvePath).default;
    if (typeof middlewareCreator === 'function') {
      middlewares.push(middlewareCreator());
    }
  }
  return middlewares;
}

function replaceCliSecurityHeaderMiddleware(app: ConnectServer) {
  const index = app.stack.findIndex(middleware => middleware.handle === securityHeadersMiddleware);
  if (index >= 0) {
    app.stack[index].handle = remoteDevtoolsSecurityHeadersMiddleware;
  }
}

// Same as securityHeadersMiddleware but allow cross-origin requests from https://chrome-devtools-frontend.appspot.com/
function remoteDevtoolsSecurityHeadersMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: (err?: Error) => void
) {
  // Block any cross origin request.
  if (
    typeof req.headers.origin === 'string' &&
    !req.headers.origin.match(/^https?:\/\/localhost:/) &&
    !req.headers.origin.match(/^https:\/\/chrome-devtools-frontend\.appspot\.com/)
  ) {
    next(
      new Error(
        'Unauthorized request from ' +
          req.headers.origin +
          '. This may happen because of a conflicting browser extension. Please try to disable it and try again.'
      )
    );
    return;
  }

  // Block MIME-type sniffing.
  res.setHeader('X-Content-Type-Options', 'nosniff');

  next();
}

// Hook before metro to process *.map that will
function remoteDevtoolsCorsMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: (err?: Error) => void
) {
  if (req.url) {
    // we just need the url.pathname,
    // so it is okay for passing http://localhost:8081 here to make new URL() works like legacy url.parse.
    const url = new URL(req.url, 'http://localhost:8081');
    const origin = req.headers.origin;
    const isValidOrigin =
      origin &&
      ['devtools://devtools', 'https://chrome-devtools-frontend.appspot.com'].includes(origin);
    if (url.pathname.endsWith('.map') && origin && isValidOrigin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      const setHeader = res.setHeader.bind(res);
      res.setHeader = (key, ...args) => {
        if (key === 'Access-Control-Allow-Origin') {
          return;
        }
        setHeader(key, ...args);
      };
    }
  }
  next();
}
