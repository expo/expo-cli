import http from 'http';
import connect from 'connect';
import { Server as HttpServer } from 'http';
import { Server as HttpsServer } from 'https';

export type MetroServer = HttpServer | HttpsServer;

export type RawRequest = http.IncomingMessage & {
  rawBody: string;
};

export type RawNextHandleFunction = (
  req: http.IncomingMessage | RawRequest,
  res: http.ServerResponse,
  next: connect.NextFunction
) => void;
