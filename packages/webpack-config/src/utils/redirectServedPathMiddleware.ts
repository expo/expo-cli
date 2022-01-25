/**
 * Copyright (c) 2022 Expo, Inc.
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Based on https://github.com/facebook/create-react-app/blob/a422bf2/packages/react-dev-utils/redirectServedPathMiddleware.js
 * But with Node LTS support.
 */
import type express from 'express';
import path from 'path';

export function createRedirectServedPathMiddleware(servedPath: string) {
  // remove end slash so user can land on `/test` instead of `/test/`
  servedPath = servedPath.slice(0, -1);
  return function redirectServedPathMiddleware(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    if (servedPath === '' || req.url === servedPath || req.url.startsWith(servedPath)) {
      next();
    } else {
      const newPath = path.posix.join(servedPath, req.path !== '/' ? req.path : '');
      res.redirect(newPath);
    }
  };
}
