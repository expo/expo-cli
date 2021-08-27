/**
 * Copyright (c) 2021 Expo, Inc.
 * Copyright (c) 2021 Callstack, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Based on https://github.com/callstack/repack/blob/3c1e059/packages/repack/src/webpack/plugins/AssetsPlugin/AssetResolver.ts
 */

import fs from 'fs';
import path from 'path';
import webpack from 'webpack';

import { escapeStringRegexp } from '../../utils/escapeStringRegexp';

export interface NativeAssetResolverConfig {
  /**
   * Override default test RegExp. If the asset matches the `test` RegExp, it will be process
   * by the custom React Native asset resolver. Otherwise, the resolution will process normally and
   * the asset will be handled by Webpack.
   */
  test?: RegExp;
  /** Target application platform. */
  platforms: string[];

  /** Extensions to collect */
  assetExtensions: string[];
}

export interface CollectedScales {
  [key: string]: {
    platform: string;
    name: string;
  };
}

interface CollectOptions {
  name: string;
  /**
   * `['ios', 'native']`
   */
  platforms: string[];
  type: string;
  assetExtensions: string[];
}

type Resolver = {
  fileSystem: typeof fs;
  getHook: (
    type: string
  ) => {
    tapAsync: (type: string, callback: (request: any, context: any, callback: any) => void) => void;
  };
};

export class NativeAssetResolver {
  static collectScales(
    files: string[],
    { name, type, platforms, assetExtensions }: CollectOptions
  ): CollectedScales {
    const platformRegexp = platforms.join('|');
    const regex = new RegExp(`^(${assetExtensions.join('|')})$`).test(type)
      ? new RegExp(
          `^${escapeStringRegexp(name)}(@\\d+(\\.\\d+)?x)?(\\.(${platformRegexp}))?\\.${type}$`
        )
      : new RegExp(`^${escapeStringRegexp(name)}(\\.(${platformRegexp}))?\\.${type}$`);

    const priority = (queryPlatform: string) => platforms.reverse().indexOf(queryPlatform);

    // Build a map of files according to the scale
    const output: CollectedScales = {};
    for (const file of files) {
      const match = regex.exec(file);
      if (match) {
        let [, scale, , , platform] = match;
        scale = scale || '@1x';
        if (!output[scale] || priority(platform) > priority(output[scale].platform)) {
          output[scale] = { platform, name: file };
        }
      }
    }

    return output;
  }

  constructor(
    public readonly config: NativeAssetResolverConfig,
    private compiler: webpack.Compiler
  ) {
    if (!this.config.test) {
      this.config.test = new RegExp(`.(${this.config.assetExtensions.join('|')})$`);
    }
  }

  apply(resolver: Resolver) {
    const { platforms, assetExtensions } = this.config;
    const test = this.config.test!;

    const logger = this.compiler.getInfrastructureLogger('ReactNativeAssetResolver');

    resolver.getHook('file').tapAsync('ReactNativeAssetResolver', (request, _context, callback) => {
      const requestPath = request.path;
      if ((typeof requestPath === 'string' && !test.test(requestPath)) || requestPath === false) {
        callback();
        return;
      }

      logger.debug('Processing asset:', requestPath);

      // @ts-ignore
      resolver.fileSystem.readdir(path.dirname(requestPath), (error, results) => {
        if (error) {
          callback();
          return;
        }

        const basename = path.basename(requestPath);
        const name = basename.replace(/\.[^.]+$/, '');
        const type = path.extname(requestPath).substring(1);
        const files = ((results as (string | Buffer)[])?.filter(
          result => typeof result === 'string'
        ) ?? []) as string[];

        let resolved = files.includes(basename) ? requestPath : undefined;

        if (!resolved) {
          const map = NativeAssetResolver.collectScales(files, {
            name,
            type,
            platforms,
            assetExtensions,
          });
          const key = map['@1x']
            ? '@1x'
            : Object.keys(map).sort(
                (a, b) => Number(a.replace(/[^\d.]/g, '')) - Number(b.replace(/[^\d.]/g, ''))
              )[0];

          resolved = map[key]?.name
            ? path.resolve(path.dirname(requestPath), map[key].name)
            : undefined;

          if (!resolved) {
            logger.error('Cannot resolve:', requestPath, {
              files,
              scales: map,
            });
            callback();
            return;
          }
        }

        const resolvedFile = {
          ...request,
          path: resolved,
          // @ts-ignore
          relativePath: request.relativePath && resolver.join(request.relativePath, resolved),
          file: true,
        };

        logger.debug('Asset resolved:', requestPath, '->', resolved);

        callback(null, resolvedFile);
      });
    });
  }
}
