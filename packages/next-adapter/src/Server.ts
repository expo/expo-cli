/* eslint-env node */
import { IncomingMessage, Server, ServerResponse, createServer } from 'http';

import { join } from 'path';
import { parse } from 'url';
import next from 'next';

export function handleRequest(
  { projectRoot, app, handle }: { projectRoot: string; app: NextApp; handle: Function },
  req: IncomingMessage,
  res: ServerResponse
) {
  if (!req.url) {
    return;
  }
  const parsedUrl = parse(req.url, true);
  const { pathname } = parsedUrl;

  // handle GET requests to service workers
  if (
    pathname &&
    ['/service-worker.js', '/expo-service-worker.js', '/workbox-service-worker.js'].includes(
      pathname
    )
  ) {
    const filePath = join(projectRoot, '.next', pathname);

    app.serveStatic(req, res, filePath);
  } else {
    handle(req, res, parsedUrl);
  }
}

type NextApp = any;

type ServerOptions = {
  app: NextApp;
  handle: Function;
  server: Server;
};

export async function createServerAsync(
  projectRoot: string,
  {
    app: possibleApp,
    handleRequest: possiblyHandleRequest,
  }: {
    app?: NextApp;
    handleRequest?: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void;
  }
): Promise<ServerOptions> {
  const app = possibleApp || next({ dev: process.env.NODE_ENV !== 'production' });
  const handle = app.getRequestHandler();

  await app.prepare();

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (possiblyHandleRequest && (await possiblyHandleRequest(req, res))) {
      return;
    }
    handleRequest({ projectRoot, app, handle }, req, res);
  });
  return {
    server,
    app,
    handle,
  };
}

export async function startServerAsync(
  projectRoot: string,
  { port = 3000 }: { port?: number } = {}
): Promise<ServerOptions> {
  const options = await createServerAsync(projectRoot, {});
  options.server.listen(port, () => {});
  return options;
}
