import http, { Server as HttpServer } from 'http';
import { Server as HttpsServer } from 'https';

import connect from 'connect';

export type MetroServer = HttpServer | HttpsServer;

export type RawRequest = http.IncomingMessage & {
  rawBody: string;
};

export type RawNextHandleFunction = (
  req: http.IncomingMessage | RawRequest,
  res: http.ServerResponse,
  next: connect.NextFunction
) => void;
