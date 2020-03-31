declare module 'metro' {
  import MetroServer from './src/Server';
  import { ServerOptions } from './Server';
  import { Graph } from './DeltaBundler';
  import { CustomTransformOptions } from './JSTransformer/worker';
  import { RequestOptions, OutputOptions } from './shared/types.flow';
  import { Server as HttpServer } from 'http';
  import { Server as HttpsServer } from 'https';
  import { loadConfig, ConfigT, InputConfigT, Middleware } from 'metro-config';
  import Yargs from 'yargs';

  type MetroMiddleWare = {
    attachHmrServer: (httpServer: HttpServer | HttpsServer) => void;
    end: () => void;
    metroServer: MetroServer;
    middleware: Middleware;
  };

  type RunServerOptions = {
    hasReducedPerformance?: boolean;
    hmrEnabled?: boolean;
    host?: string;
    onError?: (arg0: Error & { code?: string }) => void;
    onReady?: (server: HttpServer | HttpsServer) => void;
    runInspectorProxy?: boolean;
    secure?: boolean;
    secureCert?: string;
    secureKey?: string;
  };

  type BuildGraphOptions = {
    entries: ReadonlyArray<string>;
    customTransformOptions?: CustomTransformOptions;
    dev?: boolean;
    minify?: boolean;
    onProgress?: (transformedFileCount: number, totalFileCount: number) => void;
    platform?: string;
    type?: 'module' | 'script';
  };

  type RunBuildOptions = {
    entry: string;
    dev?: boolean;
    out?: string;
    onBegin?: () => void;
    onComplete?: () => void;
    onProgress?: (transformedFileCount: number, totalFileCount: number) => void;
    minify?: boolean;
    output?: {
      build: (
        arg0: MetroServer,
        arg1: RequestOptions
      ) => Promise<{
        code: string;
        map: string;
      }>;
      save: (
        arg0: {
          code: string;
          map: string;
        },
        arg1: OutputOptions,
        arg2: (...args: Array<string>) => void
      ) => Promise<unknown>;
    };
    platform?: string;
    sourceMap?: boolean;
    sourceMapUrl?: string;
  };

  type BuildCommandOptions = {} | null;
  type ServeCommandOptions = {} | null;

  export function runMetro(config: InputConfigT, options?: ServerOptions): Promise<MetroServer>;

  export { loadConfig };

  export function createConnectMiddleware(
    config: ConfigT,
    options?: ServerOptions
  ): Promise<MetroMiddleWare>;

  export function runServer(
    config: ConfigT,
    options: RunServerOptions
  ): Promise<HttpServer | HttpsServer>;

  export function runBuild(
    config: ConfigT,
    options: RunBuildOptions
  ): Promise<{
    code: string;
    map: string;
  }>;

  export function buildGraph(config: InputConfigT, options: BuildGraphOptions): Promise<Graph>;
}
