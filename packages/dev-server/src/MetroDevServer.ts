import Metro from 'metro';
import { createDevServerMiddleware } from '@react-native-community/dev-server-api';
import * as ExpoMetroConfig from 'expo-metro-config';

export async function runMetroDevServerAsync(
  projectRoot: string,
  options: ExpoMetroConfig.LoadConfigOptions
) {
  let reportEvent: ((event: any) => void) | undefined;
  const reporter = {
    update(event: any) {
      const { type, ...data } = event;
      console.log(`\u001b[1m${event.type}\u001b[22m`, data);
      if (reportEvent) {
        reportEvent(event);
      }
    },
  };

  const metroConfig = await ExpoMetroConfig.load(projectRoot, options);
  metroConfig.reporter = reporter;

  const { middleware, attachToServer } = createDevServerMiddleware({
    port: metroConfig.server.port,
    watchFolders: metroConfig.watchFolders,
  });

  const customEnhanceMiddleware = metroConfig.server.enhanceMiddleware;
  metroConfig.server.enhanceMiddleware = (metroMiddleware: any, server: unknown) => {
    if (customEnhanceMiddleware) {
      metroMiddleware = customEnhanceMiddleware(metroMiddleware, server);
    }
    return middleware.use(metroMiddleware);
  };

  const serverInstance = await Metro.runServer(metroConfig, { hmrEnabled: true });

  const { eventsSocket } = attachToServer(serverInstance);
  reportEvent = eventsSocket.reportEvent;
}
