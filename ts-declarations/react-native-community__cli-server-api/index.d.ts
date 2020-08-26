/// <reference types="node" />
/// <reference types="ws" />
declare module '@react-native-community/cli-server-api' {
  import http from 'http';
  import { Server as HttpsServer } from 'https';

  type MiddlewareOptions = {
    host?: string;
    watchFolders: ReadonlyArray<string>;
    port: number;
  };

  export function createDevServerMiddleware(
    options: MiddlewareOptions
  ): {
    attachToServer(
      server: http.Server | HttpsServer
    ): {
      debuggerProxy: {
        server: import('ws').Server;
        isDebuggerConnected(): boolean;
      };
      eventsSocket: {
        reportEvent: (event: any) => void;
      };
      messageSocket: {
        broadcast: (method: string, params?: Record<string, any> | undefined) => void;
      };
    };
    middleware: any;
  };
  //# sourceMappingURL=index.d.ts.map
}
