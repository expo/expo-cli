import type { Server as ConnectServer, HandleFunction } from 'connect';

export function replaceMiddlewareWith(
  app: ConnectServer,
  sourceMiddleware: HandleFunction,
  targetMiddleware: HandleFunction
) {
  const item = app.stack.find(middleware => middleware.handle === sourceMiddleware);
  if (item) {
    item.handle = targetMiddleware;
  }
}
