import { readConfigJson, resolveModule } from '@expo/config';
import { Server as HttpServer } from 'http';
import { Server as HttpsServer } from 'https';
import morgan from 'morgan';
import { Server as WebSocketServer } from 'ws';

import messageSocket from './common/messageSocket';
import getDevToolsMiddleware from './middleware/getDevToolsMiddleware';
import MiddlewareDevServer from './MiddlewareDevServer';
import { attachToServer } from './common/webSocketProxy';

type WebSocketProxy = {
  server?: WebSocketServer;
  isDebuggerConnected: () => boolean;
};

type MetroServer = HttpServer | HttpsServer;

export type MetroMiddlewareOptions = {
  projectRoot: string;
  watchFolders: Array<string>;
  port: number;
  host: string;
  key: string;
  cert: string;
  https: boolean;
};

function getMetroInstance(projectRoot: string): any {
  const { exp } = readConfigJson(projectRoot, true, true);
  const Metro = require(resolveModule('metro', projectRoot, exp));
  return Metro;
}

export class MetroDevServer extends MiddlewareDevServer {
  private server: MetroServer | null = null;

  public host: string | null = null;

  private serverConnections: { [key: string]: any } = {};

  get watchFolders(): string[] {
    return this.metroConfig.watchFolders;
  }

  get port(): number {
    if (!this.metroConfig || !this.metroConfig.server) {
      throw new Error('Metro config is invalid');
    }
    return this.metroConfig.server.port;
  }

  public get isRunning(): boolean {
    return !!this.server;
  }

  constructor(public options: MetroMiddlewareOptions, private metroConfig: any) {
    super();
    this.host = options.host;

    this.app.use(
      // @ts-ignore morgan and connect types mismatch
      morgan('combined', {
        skip: (_req: any, res: any) => res.statusCode < 400,
      })
    );

    metroConfig.watchFolders.forEach(this.serveStatic.bind(this));

    const customEnhanceMiddleware = metroConfig.server.enhanceMiddleware;

    metroConfig.server.enhanceMiddleware = (middleware: any, server: unknown) => {
      if (customEnhanceMiddleware) {
        middleware = customEnhanceMiddleware(middleware, server);
      }

      return this.app.use(middleware);
    };
  }

  private async startMetroBundlerAsync(): Promise<MetroServer> {
    const Metro = getMetroInstance(this.options.projectRoot);

    const server = (await Metro.runServer(this.metroConfig, {
      // onReady,
      // onError,
      host: this.options.host,
      secure: this.options.https,
      secureCert: this.options.cert,
      secureKey: this.options.key,
      hmrEnabled: true,
    })) as MetroServer;

    // In Node 8, the default keep-alive for an HTTP connection is 5 seconds. In
    // early versions of Node 8, this was implemented in a buggy way which caused
    // some HTTP responses (like those containing large JS bundles) to be
    // terminated early.
    //
    // As a workaround, arbitrarily increase the keep-alive from 5 to 30 seconds,
    // which should be enough to send even the largest of JS bundles.
    //
    // For more info: https://github.com/nodejs/node/issues/13391
    //
    server.keepAliveTimeout = 30000;

    return server;
  }

  public attachDevToolsSocket(socket: WebSocketProxy) {
    // @ts-ignore
    this.app.use(
      getDevToolsMiddleware(
        {
          host: this.options.host,
          port: this.port,
          watchFolders: this.metroConfig.watchFolders,
        },
        () => socket.isDebuggerConnected()
      )
    );
  }

  public async startAsync(): Promise<void> {
    this.server = await this.startMetroBundlerAsync();

    this.server.on('connection', connection => {
      const key = connection.remoteAddress + ':' + connection.remotePort;
      this.serverConnections[key] = connection;
      connection.on('close', () => {
        delete this.serverConnections[key];
      });
    });

    this.attachDevToolsSocket(attachToServer(this.server, '/debugger-proxy'));

    const ms = messageSocket.attachToServer(this.server, '/message');
    this.attachDevToolsSocket(ms);

    this.app.use('/reload', (_: unknown, res: any) => {
      ms.broadcast('reload');
      res.end('OK');
    });

    // const isWebpack = false;

    // if (isWebpack) {
    //   let watchers: any['raw'][] = [];
    //   const headers = {
    //     'Content-Type': 'application/json; charset=UTF-8',
    //   };

    //   this.app.use('/onchange', (request: any, res: any) => {
    //     return new Promise(resolve => {
    //       /**
    //        * React Native client opens connection at `/onchange`
    //        * and awaits reload signal (http status code - 205)
    //        */
    //       // ms.broadcast('onchange');
    //       const watcher = request.raw;
    //       watchers.push(watcher);
    //       watcher.req.on('close', () => {
    //         watchers.splice(watchers.indexOf(watcher), 1);
    //         resolve('OK');
    //       });
    //     });
    //   });
    // }
  }

  public stopAsync(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close(err => {
          if (err) reject(err);
          else resolve();
        });
        for (const key in this.serverConnections) {
          this.serverConnections[key].destroy();
          delete this.serverConnections[key];
        }
      } else {
        resolve();
      }
    });
  }
}
