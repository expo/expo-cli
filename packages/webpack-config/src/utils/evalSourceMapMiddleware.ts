/**
 * Copyright (c) 2022 Expo, Inc.
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Based on https://github.com/facebook/create-react-app/blob/a422bf2/packages/react-dev-utils/evalSourceMapMiddleware.js
 * But with Node LTS support.
 */

import type express from 'express';
import type webpack from 'webpack';
import type WebpackDevServer from 'webpack-dev-server';

function base64SourceMap(source: any) {
  const base64 = Buffer.from(JSON.stringify(source.map()), 'utf8').toString('base64');
  return `data:application/json;charset=utf-8;base64,${base64}`;
}

function getSourceById(server: WebpackDevServer & any, id: string) {
  const module = Array.from(server._stats.compilation.modules).find(
    m => server._stats.compilation.chunkGraph.getModuleId(m) === id
  ) as webpack.Module[];

  // @ts-ignore
  return module.originalSource();
}

/*
 * Middleware responsible for retrieving a generated source
 * Receives a webpack internal url: "webpack-internal:///<module-id>"
 * Returns a generated source: "<source-text><sourceMappingURL><sourceURL>"
 *
 * Based on EvalSourceMapDevToolModuleTemplatePlugin.js
 */
export function createEvalSourceMapMiddleware(server: WebpackDevServer) {
  return function handleWebpackInternalMiddleware(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    if (req.url.startsWith('/__get-internal-source')) {
      const fileName = req.query.fileName;
      if (typeof fileName !== 'string') {
        return next();
      }
      const id = fileName?.match(/webpack-internal:\/\/\/(.+)/)?.[1];
      // @ts-ignore: untyped
      if (!id || !server._stats) {
        return next();
      }

      const source = getSourceById(server, id);
      const sourceMapURL = `//# sourceMappingURL=${base64SourceMap(source)}`;
      const sourceURL = `//# sourceURL=webpack-internal:///${module.id}`;
      res.end(`${source.source()}\n${sourceMapURL}\n${sourceURL}`);
    } else {
      return next();
    }
  };
}
