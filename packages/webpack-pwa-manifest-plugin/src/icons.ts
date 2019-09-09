import { ImageFormat, ResizeMode, sharpAsync } from '@expo/image-utils';
import fs from 'fs-extra';
import mime from 'mime';
import fetch from 'node-fetch';
import path from 'path';
import stream from 'stream';
import temporary from 'tempy';
import util from 'util';

import { IconError } from './Errors';
import { AnySize, generateFingerprint, joinURI, toArray, ImageSize, toSize } from './utils';
import { fromStartupImage } from './validators/Apple';
import { Icon, ManifestIcon, ManifestOptions } from './WebpackPWAManifestPlugin.types';

const supportedMimeTypes = ['image/png', 'image/jpeg', 'image/webp'];

function sanitizeIcon(iconSnippet: Icon & { src?: string; size: any; sizes: any }): Icon {
  if (!iconSnippet.src) {
    throw new IconError('Unknown icon source.');
  }
  const sizes = toArray(iconSnippet.size || iconSnippet.sizes);
  if (!sizes) {
    throw new IconError('Unknown icon sizes.');
  }
  return {
    src: iconSnippet.src,
    resizeMode: iconSnippet.resizeMode,
    sizes,
    media: iconSnippet.media,
    destination: iconSnippet.destination,
    ios: iconSnippet.ios,
    color: iconSnippet.color,
  };
}

interface WebpackAsset {
  output: string;
  url: string;
  source: any;
  size: any;
  ios:
    | boolean
    | {
        valid: any;
        media: any;
        size: string;
        href: string;
      };
  resizeMode: any;
  color: any;
}

async function getBufferWithMimeAsync(
  { src, resizeMode, color }: Icon,
  mimeType: string,
  { width, height }: ImageSize
): Promise<Buffer> {
  let imagePath;
  if (!supportedMimeTypes.includes(mimeType)) {
    imagePath = src;
  } else {
    let localSrc = src;

    // In case the icon is a remote URL we need to download it first
    if (src.startsWith('http')) {
      localSrc = await downloadImage(src);
    }

    imagePath = await resize(localSrc, mimeType, width, height, resizeMode, color!);
  }
  try {
    return await fs.readFile(imagePath);
  } catch (err) {
    throw new IconError(`It was not possible to read '${src}'.`);
  }
}

async function downloadImage(url: string): Promise<string> {
  const outputPath = temporary.directory();
  const localPath = path.join(outputPath, path.basename(url));

  const response = await fetch(url);
  if (!response.ok) {
    throw new IconError(`It was not possible to download splash screen from '${url}'`);
  }

  // Download to local file
  const streamPipeline = util.promisify(stream.pipeline);
  await streamPipeline(response.body, fs.createWriteStream(localPath));

  return localPath;
}

async function processImageAsync(
  size: AnySize,
  icon: Icon,
  shouldFingerprint: boolean,
  publicPath: string
): Promise<{ manifestIcon: ManifestIcon; webpackAsset: WebpackAsset }> {
  const { width, height } = toSize(size);
  if (width <= 0 || height <= 0) {
    throw Error(`Failed to process image with invalid size: { width: ${width}, height: ${height}}`);
  }
  const mimeType = mime.getType(icon.src);
  if (!mimeType) {
    throw new Error(`Invalid mimeType for image with source: ${icon.src}`);
  }
  const imageBuffer = await getBufferWithMimeAsync(icon, mimeType, { width, height });

  const dimensions = `${width}x${height}`;
  const fileName = shouldFingerprint
    ? `icon_${dimensions}.${generateFingerprint(imageBuffer)}.${mime.getExtension(mimeType)}`
    : `icon_${dimensions}.${mime.getExtension(mimeType)}`;
  const iconOutputDir = icon.destination ? joinURI(icon.destination, fileName) : fileName;
  const iconPublicUrl = joinURI(publicPath, iconOutputDir);

  return {
    manifestIcon: {
      src: iconPublicUrl,
      sizes: dimensions,
      type: mimeType,
    },
    webpackAsset: {
      output: iconOutputDir,
      url: iconPublicUrl,
      source: imageBuffer,
      size: imageBuffer.length,
      ios: icon.ios
        ? { valid: icon.ios, media: icon.media, size: dimensions, href: iconPublicUrl }
        : false,
      resizeMode: icon.resizeMode,
      color: icon.color,
    },
  };
}

function ensureValidMimeType(mimeType: string): ImageFormat {
  if (['input', 'jpeg', 'jpg', 'png', 'raw', 'tiff', 'webp'].includes(mimeType)) {
    return mimeType as ImageFormat;
  }
  return 'png';
}

async function resize(
  inputPath: string,
  mimeType: string,
  width: number,
  height: number,
  fit: ResizeMode = 'contain',
  background: string
) {
  const format = ensureValidMimeType(mimeType.split('/')[1]);

  try {
    const outputPath = temporary.directory();
    await sharpAsync(
      {
        input: inputPath,
        output: outputPath,
        format,
      },
      [
        {
          operation: 'flatten',
          background,
        },
        {
          operation: 'resize',
          width,
          height,
          fit,
          background,
        },
      ]
    );
    return path.join(outputPath, path.basename(inputPath));
  } catch ({ message }) {
    throw new IconError(`It was not possible to generate splash screen '${inputPath}'. ${message}`);
  }
}

export function retrieveIcons(manifest: ManifestOptions): [Icon[], ManifestOptions] {
  // Remove these items so they aren't written to disk.
  const { startupImages, icons, ...config } = manifest;
  const parsedStartupImages = toArray(startupImages);

  let parsedIcons = toArray(icons);

  if (parsedStartupImages.length) {
    // TODO: Bacon: use all of the startup images
    const startupImage = parsedStartupImages[0];
    parsedIcons = [...parsedIcons, ...fromStartupImage(startupImage)];
  }

  const response: Icon[] = parsedIcons.map(icon => sanitizeIcon(icon));
  return [response, config];
}

export async function parseIconsAsync(
  inputIcons: Icon[],
  fingerprint: boolean,
  publicPath: string
): Promise<{ icons?: ManifestIcon[]; assets?: WebpackAsset[] }> {
  if (!inputIcons.length) {
    return {};
  }

  const icons: ManifestIcon[] = [];
  const assets: WebpackAsset[] = [];

  let promises: Promise<any>[] = [];
  for (const icon of inputIcons) {
    const { sizes } = icon;
    promises = [
      ...promises,
      ...sizes!.map(async size => {
        const { manifestIcon, webpackAsset } = await processImageAsync(
          size,
          icon,
          fingerprint,
          publicPath
        );
        icons.push(manifestIcon);
        assets.push(webpackAsset);
      }),
    ];
  }
  await Promise.all(promises);

  return {
    icons: icons
      .filter(icon => icon)
      .sort(({ sizes }, { sizes: sizesB }) => {
        if (sizes < sizesB) return -1;
        else if (sizes > sizesB) return 1;
        return 0;
      }),
    // startupImages: icons.filter(({ isStartupImage }) => isStartupImage),
    assets,
  };
}
