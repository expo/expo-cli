import { getConfig, resolveModule } from '@expo/config';
import { createDevServerMiddleware } from '@react-native-community/dev-server-api';
import Log from '@expo/bunyan';
import * as ExpoMetroConfig from '@expo/metro-config';
import bodyParser from 'body-parser';

import clientLogsMiddleware from './middleware/clientLogsMiddleware';
import LogReporter from './LogReporter';

export type MetroDevServerOptions = ExpoMetroConfig.LoadOptions & { logger: Log };

export async function runMetroDevServerAsync(projectRoot: string, options: MetroDevServerOptions) {
  const { exp } = getConfig(projectRoot);
  const Metro = require(resolveModule('metro', projectRoot, exp));
  // TODO(ville): implement a reporter
  const reporter = new LogReporter(options.logger);

  const metroConfig = await ExpoMetroConfig.loadAsync(projectRoot, { reporter, ...options });

  const { middleware, attachToServer } = createDevServerMiddleware({
    port: metroConfig.server.port,
    watchFolders: [...metroConfig.watchFolders],
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

  const { eventsSocket } = attachToServer(serverInstance);
  reporter.reportEvent = eventsSocket.reportEvent;

  return {
    server: serverInstance,
    middleware,
  };
}
