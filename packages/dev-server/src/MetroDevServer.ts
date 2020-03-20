import Metro from 'metro';
import { createDevServerMiddleware } from '@react-native-community/dev-server-api';
import * as MetroConfig from '@expo/metro-config';

export type MetroMiddlewareOptions = {
  projectRoot: string;
  watchFolders: Array<string>;
  port: number;
  host?: string;
  key?: string;
  cert?: string;
  https?: boolean;
};

export async function runMetroDevServerAsync(options: MetroMiddlewareOptions) {
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

  const metroConfig = await MetroConfig.load(options.projectRoot);
  metroConfig.reporter = reporter;

  const { middleware, attachToServer } = createDevServerMiddleware({
    host: options.host,
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

  const serverInstance = await Metro.runServer(metroConfig, {
    host: options.host,
    secure: options.https,
    secureCert: options.cert,
    secureKey: options.key,
    hmrEnabled: true,
  });

  const { eventsSocket } = attachToServer(serverInstance);
  reportEvent = eventsSocket.reportEvent;
}
