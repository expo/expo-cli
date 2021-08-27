/**
 * Copyright (c) 2021 Expo, Inc.
 * Copyright (c) 2021 Callstack, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Based on https://github.com/callstack/repack/blob/3c1e059/packages/repack/src/webpack/plugins/AssetsPlugin/assetsLoader.ts
 */

import crypto from 'crypto';
import { imageSize } from 'image-size';
import { ISizeCalculationResult } from 'image-size/dist/types/interface';
import utils from 'loader-utils';
import path from 'path';
import { validate as validateSchema } from 'schema-utils';

import { escapeStringRegexp } from '../../utils/escapeStringRegexp';
import { CollectedScales, NativeAssetResolver } from './NativeAssetResolver';

interface Options {
  platforms: string[];
  assetExtensions: string[];
  persist?: boolean;
  publicPath?: string;
}

function getOptions(loaderContext: any): Options {
  const options = utils.getOptions(loaderContext) || {};

  validateSchema(
    {
      type: 'object',
      required: ['platforms', 'assetExtensions'],
      properties: {
        platforms: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        assetExtensions: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        persist: { type: 'boolean' },
        publicPath: { type: 'string' },
      },
    },
    options,
    { name: 'nativeAssetsLoader' }
  );

  return (options as unknown) as Options;
}

export const raw = true;

export default async function nativeAssetsLoader(this: any) {
  this.cacheable();

  const callback = this.async();
  const logger = this.getLogger('nativeAssetsLoader');
  const rootContext = this.rootContext;

  logger.debug('Processing:', this.resourcePath);

  try {
    const options = getOptions(this);
    const pathSeparatorPattern = new RegExp(`\\${path.sep}`, 'g');
    const resourcePath = this.resourcePath;
    const dirname = path.dirname(resourcePath);
    // Relative path to rootContext without any ../ due to https://github.com/callstack/haul/issues/474
    // Assets from from outside of rootContext, should still be placed inside bundle output directory.
    // Example:
    //   resourcePath    = monorepo/node_modules/my-module/image.png
    //   dirname         = monorepo/node_modules/my-module
    //   rootContext     = monorepo/packages/my-app/
    //   relativeDirname = ../../node_modules/my-module (original)
    // So when we calculate destination for the asset for iOS ('assets' + relativeDirname + filename),
    // it will end up outside of `assets` directory, so we have to make sure it's:
    //   relativeDirname = node_modules/my-module (tweaked)
    const relativeDirname = path
      .relative(rootContext, dirname)
      .replace(new RegExp(`^[\\.\\${path.sep}]+`), '');
    const type = path.extname(resourcePath).replace(/^\./, '');
    const assetsPath = 'assets';
    const suffix = `(@\\d+(\\.\\d+)?x)?(\\.(${options.platforms.join('|')}))?\\.${type}$`;
    const filename = path.basename(resourcePath).replace(new RegExp(suffix), '');
    // Name with embedded relative dirname eg `node_modules_reactnative_libraries_newappscreen_components_logo.png`
    const normalizedName = `${(relativeDirname.length === 0
      ? filename
      : `${relativeDirname.replace(pathSeparatorPattern, '_')}_${filename}`
    )
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')}.${type}`;

    const files = await new Promise<string[]>((resolve, reject) =>
      this.fs.readdir(dirname, (error: Error | null, results: any[]) => {
        if (error) {
          reject(error);
        } else {
          resolve(
            (results as any[] | undefined)?.filter(result => typeof result === 'string') ?? []
          );
        }
      })
    );
    const scales = NativeAssetResolver.collectScales(files, {
      name: filename,
      type,
      assetExtensions: options.assetExtensions,
      platforms: options.platforms,
    });

    const scaleKeys = Object.keys(scales).sort(
      (a, b) => parseInt(a.replace(/[^\d.]/g, ''), 10) - parseInt(b.replace(/[^\d.]/g, ''), 10)
    );

    const assets = await Promise.all(
      scaleKeys.map(
        (
          scale
        ): Promise<{
          destination: string;
          content: string | Buffer | undefined;
        }> => {
          const scaleFilePath = path.join(dirname, scales[scale].name);
          this.addDependency(scaleFilePath);

          return new Promise((resolve, reject) =>
            this.fs.readFile(scaleFilePath, (error: Error | null, results: any) => {
              if (error) {
                reject(error);
              } else {
                let destination;

                if (options.persist && options.platforms.includes('android')) {
                  const testXml = /\.(xml)$/;
                  const testMP4 = /\.(mp4)$/;
                  const testImages = /\.(png|jpg|gif|webp)$/;
                  const testFonts = /\.(ttf|otf|ttc)$/;

                  // found font family
                  if (testXml.test(normalizedName) && results?.indexOf('font-family') !== -1) {
                    destination = 'font';
                  } else if (testFonts.test(normalizedName)) {
                    // font extensions
                    destination = 'font';
                  } else if (testMP4.test(normalizedName)) {
                    // video files extensions
                    destination = 'raw';
                  } else if (testImages.test(normalizedName) || testXml.test(normalizedName)) {
                    // images extensions
                    switch (scale) {
                      case '@0.75x':
                        destination = 'drawable-ldpi';
                        break;
                      case '@1x':
                        destination = 'drawable-mdpi';
                        break;
                      case '@1.5x':
                        destination = 'drawable-hdpi';
                        break;
                      case '@2x':
                        destination = 'drawable-xhdpi';
                        break;
                      case '@3x':
                        destination = 'drawable-xxhdpi';
                        break;
                      case '@4x':
                        destination = 'drawable-xxxhdpi';
                        break;
                      default:
                        throw new Error(`Unknown scale ${scale} for ${scaleFilePath}`);
                    }
                  } else {
                    // everything else is going to RAW
                    destination = 'raw';
                  }

                  destination = path.join(destination, normalizedName);
                } else {
                  const name = `${filename}${scale === '@1x' ? '' : scale}.${type}`;
                  destination = path.join(assetsPath, relativeDirname, name);
                }

                resolve({
                  destination,
                  content: results,
                });
              }
            })
          );
        }
      )
    );

    assets.forEach(asset => {
      const { destination, content } = asset;

      logger.debug('Asset emitted:', destination);
      // Assets are emitted relatively to `output.path`.
      this.emitFile(destination, content ?? '');
    });

    let publicPath = path.join(assetsPath, relativeDirname).replace(pathSeparatorPattern, '/');

    if (options.publicPath) {
      publicPath = path.join(options.publicPath, publicPath);
    }

    const hashes = await Promise.all(
      assets.map(asset => {
        const hash = crypto.createHash('md5');
        hash.update(asset.content?.toString() ?? asset.destination, 'utf8');
        return hash.digest('hex');
      })
    );

    let info: ISizeCalculationResult | undefined;

    try {
      info = imageSize(this.resourcePath);

      const match = path
        .basename(this.resourcePath)
        .match(new RegExp(`^${escapeStringRegexp(filename)}${suffix}`));

      if (match?.[1]) {
        const scale = Number(match[1].replace(/[^\d.]/g, ''));

        if (typeof scale === 'number' && Number.isFinite(scale)) {
          info.width && (info.width /= scale);
          info.height && (info.height /= scale);
        }
      }
    } catch (e) {
      // Asset is not an image
    }

    logger.debug('Asset processed:', {
      resourcePath,
      platforms: options.platforms,
      rootContext,
      relativeDirname,
      type,
      assetsPath,
      filename,
      normalizedName,
      scales,
      assets: assets.map(asset => asset.destination),
      publicPath,
      width: info?.width,
      height: info?.height,
    });

    callback?.(
      null,
      createAssetCodeBlock({
        persist: !!options.persist,
        scales,
        filename,
        type,
        hashes,
        httpServerLocation: publicPath,
        fileSystemLocation: dirname,
        ...(info || {}),
      })
    );
  } catch (error) {
    callback?.(error);
  }
}

function createAssetCodeBlock({
  persist,
  scales,
  filename,
  type,
  hashes,
  httpServerLocation,
  height,
  width,
  fileSystemLocation,
}: {
  persist: boolean;
  scales: CollectedScales;
  filename: string;
  type: string;
  hashes: string[];
  httpServerLocation: string;
  height?: number;
  width?: number;
  fileSystemLocation: string;
}) {
  return [
    `var AssetRegistry = require('react-native/Libraries/Image/AssetRegistry');`,
    `module.exports = AssetRegistry.registerAsset({`,
    `  __packager_asset: true,`,
    `  scales: ${JSON.stringify(scales)},`,
    `  name: ${JSON.stringify(filename)},`,
    `  type: ${JSON.stringify(type)},`,
    `  hash: ${JSON.stringify(hashes.join())},`,
    `  httpServerLocation: ${JSON.stringify(httpServerLocation)},`,
    `  ${persist ? '' : `fileSystemLocation: ${JSON.stringify(fileSystemLocation)},`}`,
    `  ${height != null ? `height: ${height},` : ''}`,
    `  ${width != null ? `width: ${width},` : ''}`,
    `});`,
  ].join('\n');
}
