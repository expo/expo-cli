import Metro from 'metro';
import { createDevServerMiddleware } from '@react-native-community/dev-server-api';
import Log from '@expo/bunyan';
import * as ExpoMetroConfig from '@expo/metro-config';
import clientLogsMiddleware from './middleware/clientLogsMiddleware';

export async function runMetroDevServerAsync(
  projectRoot: string,
  options: ExpoMetroConfig.LoadOptions & { logger: Log }
) {
  let reportEvent: ((event: any) => void) | undefined;
  // TODO(ville): implement a reporter
  const reporter = {
    update(event: any) {
      const { type, ...data } = event;
      console.log(`[${event.type}]`, data);
      if (reportEvent) {
        reportEvent(event);
      }
    },
  };

  const metroConfig = await ExpoMetroConfig.loadAsync(projectRoot, { reporter, ...options });

  const { middleware, attachToServer } = createDevServerMiddleware({
    port: metroConfig.server.port,
    watchFolders: metroConfig.watchFolders,
  });
  middleware.use(clientLogsMiddleware(options.logger));

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
  reportEvent = eventsSocket.reportEvent;
}
