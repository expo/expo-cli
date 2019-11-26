import http from 'http';
import connect from 'connect';

import { Server as HttpServer } from 'http';
import { Server as HttpsServer } from 'https';

type MetroServer = HttpServer | HttpsServer;

export default function shutdownMiddleware(server: MetroServer): connect.NextHandleFunction {
  return function(req: http.IncomingMessage, res: http.ServerResponse, next: (err?: any) => void) {
    if (req.url === '/shutdown') {
      server.close();
      res.end('Success');
    } else {
      next();
    }
  };
}
