import fs from 'fs-extra';
import http from 'http';
// @ts-ignore
import mimeTypes from 'mime-types';
import * as path from 'path';
// @ts-ignore
import handleRangeHeaders from 'webpack-dev-middleware/dist/utils/handleRangeHeaders';

import { AnyCompiler, getPlatformFromRequest } from '../utils/getFileAsync';

/**
 * Create Metro interop asset redirect middleware.
 * This is required for making icon assets show up in the Expo Go app (icon preview, splash screen).
 *
 * TODO: We should get rid of this Metro nonsense.
 *
 * @param projectRoot
 * @param compiler
 * @param servedPath
 * @returns
 */
export function createRedirectAssetPathsMiddleware(projectRoot: string, compiler: AnyCompiler) {
  return async function redirectServedPathMiddleware(
    req: http.IncomingMessage & { body?: any; path?: string },
    res: http.ServerResponse & {
      redirect: (file: string) => void;
      send: Function;
      get?: Function;
      set?: Function;
    },
    next: (err?: Error) => void
  ) {
    if (!req.path || !req.path.startsWith('/assets/')) return next();

    const assetPath = req.path.match(/^\/assets\/(.+)$/)?.[1];

    if (!assetPath) {
      throw new Error('Could not extract asset path from URL');
    }

    const platform = getPlatformFromRequest(req);
    // Only support native platforms
    if (!platform || platform === 'web') {
      return next();
    }

    // http://localhost:19006/assets/assets/icon.png
    // const platformCompiler = getCompilerForPlatform(compiler, platform);
    // console.log('redirect:platform -> ', platform);
    // console.log('redirect:filename -> ', assetPath);
    let content = await fs.promises.readFile(path.join(projectRoot, assetPath));
    // let content = await getFileFromCompilerAsync(platformCompiler, {
    //   fileName: path.join(projectRoot, assetPath),
    //   platform,
    // });

    const contentTypeHeader = res.get ? res.get('Content-Type') : res.getHeader('Content-Type');

    if (!contentTypeHeader) {
      // content-type name(like application/javascript; charset=utf-8) or false
      const contentType = mimeTypes.contentType(path.extname(assetPath)); // Only set content-type header if media type is known
      // https://tools.ietf.org/html/rfc7231#section-3.1.1.5

      if (contentType) {
        // Express API
        if (res.set) {
          res.set('Content-Type', contentType);
        } // Node.js API
        else {
          res.setHeader('Content-Type', contentType);
        }
      }
    }

    // Tell clients to cache this for 1 year.
    // This is safe as the asset url contains a hash of the asset.
    if (process.env.REACT_NATIVE_ENABLE_ASSET_CACHING === String(true)) {
      res.setHeader('Cache-Control', 'max-age=31536000');
    }

    content = handleRangeHeaders({ logger: console }, content, req, res);
    if (res.send) {
      res.send(content);
    } // Node.js API
    else {
      res.setHeader('Content-Length', content.length);

      if (req.method === 'HEAD') {
        res.end();
      } else {
        res.end(content);
      }
    }
  };
}
