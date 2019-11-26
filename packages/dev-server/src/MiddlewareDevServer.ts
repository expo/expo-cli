/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import compression from 'compression';
import connect from 'connect';
// @ts-ignore
import errorhandler from 'errorhandler';
import serveStatic from 'serve-static';

import getSecurityHeadersMiddleware from './middleware/getSecurityHeadersMiddleware';
import loadRawBodyMiddleware from './middleware/loadRawBodyMiddleware';
import statusPageMiddleware from './middleware/statusPageMiddleware';

export type MiddlewareOptions = {
  projectRoot: string;
  host?: string;
  watchFolders: Array<string>;
  port: number;
};

export default class MiddlewareDevServer {
  app: connect.Server;

  constructor() {
    this.app = connect()
      .use(getSecurityHeadersMiddleware)
      .use(loadRawBodyMiddleware)
      .use(statusPageMiddleware)
      // @ts-ignore compression and connect types mismatch
      .use(compression())
      .use(errorhandler());
  }

  serveStatic(folder: string) {
    // @ts-ignore serveStatic and connect types mismatch
    this.app.use(serveStatic(folder));
  }

  attachMiddleware(handleFunction: connect.HandleFunction) {
    this.app.use(handleFunction);
  }

  attachMiddlewareWithURL(url: string, handleFunction: connect.HandleFunction) {
    this.app.use(url, handleFunction);
  }

  getConnectInstance() {
    return this.app;
  }
}
