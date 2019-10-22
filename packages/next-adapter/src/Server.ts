/* eslint-env node */
import { createServer, Server, IncomingMessage, ServerResponse } from 'http';

import { join } from 'path';
import { parse } from 'url';
import next from 'next';

export function handleRequest(
  { app, handle }: { app: NextApp; handle: Function },
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
    const filePath = join(__dirname, '.next', pathname);

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

export async function createServerAsync({
  app: possibleApp,
  handleRequest: possiblyHandleRequest,
}: {
  app?: NextApp;
  handleRequest?: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void;
}): Promise<ServerOptions> {
  const app = possibleApp || next({ dev: process.env.NODE_ENV !== 'production' });
  const handle = app.getRequestHandler();

  await app.prepare();

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (possiblyHandleRequest && (await possiblyHandleRequest(req, res))) {
      return;
    }
    handleRequest({ app, handle }, req, res);
  });
  return {
    server,
    app,
    handle,
  };
}

export async function startServerAsync(port: number = 3000): Promise<ServerOptions> {
  const options = await createServerAsync({});
  options.server.listen(port, () => {});
  return options;
}
