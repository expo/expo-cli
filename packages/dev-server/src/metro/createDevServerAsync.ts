import type Log from '@expo/bunyan';
import connect from 'connect';
import http from 'http';
import type MetroConfig from 'metro-config';

import {
  importInspectorProxyServerFromProject,
  importMetroConfigFromProject,
  importMetroHmrServerFromProject,
  importMetroLibAttachWebsocketServerFromProject,
  importMetroServerFromProject,
} from './importMetroFromProject';

async function getConfig(
  projectRoot: string,
  config: MetroConfig.InputConfigT
): Promise<MetroConfig.ConfigT> {
  const { getDefaultConfig, mergeConfig } = importMetroConfigFromProject(projectRoot);
  const defaultConfig = await getDefaultConfig(config.projectRoot || projectRoot);
  return mergeConfig(defaultConfig, config);
}

/**
 * Send the initial load event to our logger.
 * @param config loaded metro config
 */
function reportInitializeStarted(config: MetroConfig.ConfigT) {
  config.reporter.update({
    hasReducedPerformance: false,
    port: config.server.port,
    type: 'initialize_started',
  });
}

async function runMetro(projectRoot: string, config: MetroConfig.InputConfigT) {
  const MetroServer = importMetroServerFromProject(projectRoot);

  const mergedConfig = await getConfig(projectRoot, config);

  reportInitializeStarted(mergedConfig);

  return new MetroServer(mergedConfig);
}

type RunServerProps = {
  config: MetroConfig.ConfigT;
  logger: Log;
  onReady?: (server: http.Server) => void;
};

export async function createDevServerAsync(
  projectRoot: string,
  { config, logger, onReady }: RunServerProps
): Promise<{
  server: http.Server;
}> {
  const serverApp = connect();

  const metroServer = await runMetro(projectRoot, config);

  const { InspectorProxy } = importInspectorProxyServerFromProject(projectRoot);
  const MetroHmrServer = importMetroHmrServerFromProject(projectRoot);
  const attachWebsocketServer = importMetroLibAttachWebsocketServerFromProject(projectRoot);

  let middleware = metroServer.processRequest;

  // Enhance the resulting middleware using the config options
  if (config.server.enhanceMiddleware) {
    middleware = config.server.enhanceMiddleware(middleware, metroServer);
  }

  serverApp.use(middleware);

  let inspectorProxy: typeof InspectorProxy | null = null;
  if (config.server.runInspectorProxy) {
    inspectorProxy = new InspectorProxy(config.projectRoot);
  }

  const httpServer = http.createServer(serverApp);

  // Disable any kind of automatic timeout behavior for incoming
  // requests in case it takes the packager more than the default
  // timeout of 120 seconds to respond to a request.
  httpServer.timeout = 0;

  return new Promise((resolve, reject) => {
    httpServer.listen(config.server.port, () => {
      if (onReady) {
        onReady(httpServer);
      }

      // Create a new HMR Server
      // TODO: Replace with a metro-agnostic HMR server and share with Webpack.
      const websocketServer = new MetroHmrServer(
        metroServer.getBundler(),
        metroServer.getCreateModuleId(),
        config
      );

      // attachHmrServer
      // TODO: Extract this function into expo/dev-server
      attachWebsocketServer({
        httpServer,
        path: '/hot',
        websocketServer,
      });

      if (inspectorProxy) {
        inspectorProxy.addWebSocketListener(httpServer);

        // TODO(hypuk): Refactor inspectorProxy.processRequest into separate request handlers
        // so that we could provide routes (/json/list and /json/version) here.
        // Currently this causes Metro to give warning about T31407894.
        // $FlowFixMe[method-unbinding] added when improving typing for this parameters
        serverApp.use(inspectorProxy.processRequest.bind(inspectorProxy));
      }

      resolve({ server: httpServer });
    });

    httpServer.on('error', error => {
      // Send a custom log to inform our system that the server has had an unexpected error.
      logger.error({ tag: 'metro' }, `Server error: ${error.message}`);
      metroServer.end();
      reject(error);
    });

    httpServer.on('close', () => {
      metroServer.end();
    });
  });
}
