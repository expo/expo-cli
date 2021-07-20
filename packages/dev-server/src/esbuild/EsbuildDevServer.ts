import { ExpoConfig } from '@expo/config';
import { INTERNAL_CALLSITES_REGEX } from '@expo/metro-config';
import {
  createDevServerMiddleware,
  securityHeadersMiddleware,
} from '@react-native-community/cli-server-api';
import bodyParser from 'body-parser';
import type { Server as ConnectServer } from 'connect';
import Debug from 'debug';
import * as esbuild from 'esbuild';
import { ensureDirSync } from 'fs-extra';
import http from 'http';
import type { IncomingMessage, ServerResponse } from 'http';
import { BundleOptions } from 'metro';
import type Metro from 'metro';
import path from 'path';
import resolveFrom from 'resolve-from';
import { parse as parseUrl } from 'url';

import { BundleOutput, MessageSocket, MetroDevServerOptions } from '../MetroDevServer';
import { StackFrame } from '../middleware/Symbolicator';
import clientLogsMiddleware from '../middleware/clientLogsMiddleware';
import createJsInspectorMiddleware from '../middleware/createJsInspectorMiddleware';
import { createSymbolicateMiddleware } from '../middleware/createSymbolicateMiddleware';
import { remoteDevtoolsCorsMiddleware } from '../middleware/remoteDevtoolsCorsMiddleware';
import { remoteDevtoolsSecurityHeadersMiddleware } from '../middleware/remoteDevtoolsSecurityHeadersMiddleware';
import { replaceMiddlewareWith } from '../middleware/replaceMiddlewareWith';
import { loadConfig } from './EsbuildConfig';

const debug = Debug('dev-server:esbuild');

const nativeMiddleware = (port: number, _platform: string) => (
  req: IncomingMessage,
  res: ServerResponse,
  next: (err?: Error) => void
) => {
  if (!req.url) return next();

  const urlObj = parseUrl(req.url, true);

  const pathname = urlObj.pathname || '';

  if (pathname === '/logs' || pathname === '/') {
    return next();
  }

  // TODO: Replace
  const url = req?.url?.split('?')[0];
  if (!url) return next();

  let proxyPath: string = '';

  if (pathname.endsWith('.bundle')) {
    // TODO: parseOptionsFromUrl
    const { platform = _platform } = urlObj.query || {};
    proxyPath = url.replace('.bundle', `.${platform}.js`);

    // TODO: esbuild's dev server doesn't support arbitrary bundle paths.
    proxyPath = `/index.${platform}.js`;
  } else if (pathname.endsWith('.map')) {
    // Chrome dev tools may need to access the source maps.
    res.setHeader('Access-Control-Allow-Origin', 'devtools://devtools');
    proxyPath = url;
  } else if (pathname.endsWith('.assets')) {
    proxyPath = url;
  } else if (pathname.startsWith('/assets/')) {
    proxyPath = url;
  } else if (pathname === '/symbolicate') {
    return next();
  } else {
    return next();
  }

  const proxyUrl = `http://0.0.0.0:${port}${proxyPath}`;

  debug('proxy url: ', proxyUrl);

  const proxyReq = http.request(
    proxyUrl,
    { method: req.method, headers: req.headers },
    proxyRes => {
      if (proxyRes.statusCode === 404) return next();
      if (url?.endsWith('.js')) proxyRes.headers['content-type'] = 'application/javascript';

      res.writeHead(proxyRes.statusCode!, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    }
  );
  req.pipe(proxyReq, { end: true });
};

export async function startDevServerAsync(
  projectRoot: string,
  options: MetroDevServerOptions & { isDev?: boolean }
): Promise<{
  server: http.Server;
  middleware: any;
  messageSocket: MessageSocket;
}> {
  const { port = 19000 } = options;
  const platform = process.env.EXPO_PLATFORM ?? ('ios' as any);

  const customizeFrame = (frame: StackFrame) => {
    let collapse = Boolean(frame.file && INTERNAL_CALLSITES_REGEX.test(frame.file));

    if (!collapse) {
      // This represents the first frame of the stacktrace.
      // Often this looks like: `__r(0);`.
      // The URL will also be unactionable in the app and therefore not very useful to the developer.
      if (
        frame.column === 3 &&
        frame.methodName === 'global code' &&
        frame.file?.match(/^https?:\/\//g)
      ) {
        collapse = true;
      }
    }

    return { ...(frame || {}), collapse };
  };

  ensureDirSync(path.join(projectRoot, '.expo/esbuild/cache'));

  const buildOptions = loadConfig(projectRoot, {
    logger: options.logger,
    platform,
    isDev: !!options.isDev,
    cleanCache: options.resetCache,
    // config: {}
  });

  let reload: Function;
  const liveReload = !!options.isDev;
  await esbuild.build({
    ...buildOptions,
    watch: {
      onRebuild(error, result) {
        if (error) {
          options.logger.error({ tag: 'dev-server' }, `Failed to watch build changes: ${error}`);
          throw error;
        }

        options.logger.info(
          { tag: 'dev-server' },
          `Rebuild succeeded. errors: ${result?.errors.length}, warnings: ${result?.warnings.length}`
        );

        if (liveReload && reload) {
          reload();
        }
      },
    },
  });

  const dist = './dist';
  return new Promise((res, rej) => {
    esbuild
      .serve({ servedir: dist }, {})
      .then(() => {
        const { middleware, attachToServer } = createDevServerMiddleware({
          host: '127.0.0.1',
          port,
          watchFolders: [],
        });

        middleware.use(nativeMiddleware(8000, platform));
        middleware.stack.unshift(middleware.stack.pop());

        // securityHeadersMiddleware does not support cross-origin requests for remote devtools to get the sourcemap.
        // We replace with the enhanced version.

        replaceMiddlewareWith(
          middleware as ConnectServer,
          securityHeadersMiddleware,
          remoteDevtoolsSecurityHeadersMiddleware
        );
        middleware.use(remoteDevtoolsCorsMiddleware);

        middleware.use(bodyParser.json());
        middleware.use(
          '/symbolicate',
          createSymbolicateMiddleware({
            logger: options.logger,
            customizeFrame,
            dist: path.join(projectRoot, dist),
          })
        );
        middleware.use('/logs', clientLogsMiddleware(options.logger));
        middleware.use('/inspector', createJsInspectorMiddleware());

        const server = http.createServer(middleware).listen(port);
        const { messageSocket } = attachToServer(server);

        reload = () => messageSocket.broadcast('reload');

        res({
          server,
          middleware,
          messageSocket,
        });
      })
      .catch(rej);
  });
}

export async function bundleAsync(
  projectRoot: string,
  expoConfig: ExpoConfig,
  options: MetroDevServerOptions,
  bundles: BundleOptions[]
): Promise<BundleOutput[]> {
  // TODO

  throw new Error('unimp');
  // const { server } = await startDevServerAsync(projectRoot, { ...options, isDev: false });

  // async function buildAsync(bundle: BundleOptions) {}

  // try {
  //   return await Promise.all(
  //     bundles.map(async (bundle: BundleOptions) => {
  //       const bundleOutput = await buildAsync(bundle);
  //       return maybeAddHermesBundleAsync(bundle, bundleOutput);
  //     })
  //   );
  // } finally {
  //   server.close();
  // }
}

// TODO: Import from project
function importBundlerFromProject(projectRoot: string): typeof Metro {
  const resolvedPath = resolveFrom.silent(projectRoot, 'esbuild');
  if (!resolvedPath) {
    throw new Error('Missing package "esbuild" in the project at ' + projectRoot + '.');
  }
  return require(resolvedPath);
}
