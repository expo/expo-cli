import http from 'http';

import { SimpleHandleFunction, NextHandleFunction } from 'connect';
import { RawRequest, RawNextHandleFunction } from './index.types';

export function createMiddlewareWithURL(
  handle: SimpleHandleFunction | RawNextHandleFunction,
  urls: string[]
): SimpleHandleFunction | NextHandleFunction {
  return async (
    req: http.IncomingMessage | RawRequest,
    res: http.ServerResponse,
    next: (err?: any) => void
  ) => {
    if (!req.url || !urls.includes(req.url)) {
      next();
      return;
    }
    return handle(req, res, next);
  };
}
