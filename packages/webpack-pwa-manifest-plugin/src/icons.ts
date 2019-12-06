import { ImageFormat, ResizeMode, isAvailableAsync, sharpAsync } from '@expo/image-utils';
import fs from 'fs-extra';
import mime from 'mime';
import fetch from 'node-fetch';
import path from 'path';
import stream from 'stream';
import temporary from 'tempy';
import util from 'util';
import chalk from 'chalk';

import crypto from 'crypto';
import { IconError } from './Errors';
import { AnySize, ImageSize, joinURI, toArray, toSize } from './utils';
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

async function ensureCacheDirectory(projectRoot: string, cacheKey: string): Promise<string> {
  const cacheFolder = path.join(projectRoot, '.expo/web/cache/production/images', cacheKey);
  await fs.ensureDir(cacheFolder);
  return cacheFolder;
}

async function getImageFromCacheAsync(fileName: string, cacheKey: string): Promise<null | Buffer> {
  try {
    return await fs.readFile(path.resolve(cacheKeys[cacheKey], fileName));
  } catch (_) {
    return null;
  }
}

async function cacheImageAsync(fileName: string, buffer: Buffer, cacheKey: string): Promise<void> {
  try {
    await fs.writeFile(path.resolve(cacheKeys[cacheKey], fileName), buffer);
  } catch ({ message }) {
    console.warn(`error caching image: "${fileName}". ${message}`);
  }
}

async function processImageAsync(
  size: AnySize,
  icon: Icon,
  publicPath: string,
  cacheKey: string
): Promise<{ manifestIcon: ManifestIcon; webpackAsset: WebpackAsset }> {
  const { width, height } = toSize(size);
  if (width <= 0 || height <= 0) {
    throw Error(`Failed to process image with invalid size: { width: ${width}, height: ${height}}`);
  }
  const mimeType = mime.getType(icon.src);
  if (!mimeType) {
    throw new Error(`Invalid mimeType for image with source: ${icon.src}`);
  }

  const dimensions = `${width}x${height}`;
  const fileName = `icon_${dimensions}.${mime.getExtension(mimeType)}`;

  let imageBuffer: Buffer | null = await getImageFromCacheAsync(fileName, cacheKey);
  if (!imageBuffer) {
    imageBuffer = await getBufferWithMimeAsync(icon, mimeType, { width, height });
    await cacheImageAsync(fileName, imageBuffer, cacheKey);
  }

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

// Calculate SHA256 Checksum value of a file based on its contents
function calculateHash(filePath: string): string {
  const contents = fs.readFileSync(filePath);
  return crypto
    .createHash('sha256')
    .update(contents)
    .digest('hex');
}

// Create a hash key for caching the images between builds
function createCacheKey(icon: Icon): string {
  const hash = calculateHash(icon.src);
  return [hash, icon.resizeMode, icon.color].filter(Boolean).join('-');
}

const cacheKeys: { [key: string]: string } = {};

export async function parseIconsAsync(
  projectRoot: string,
  inputIcons: Icon[],
  publicPath: string
): Promise<{ icons?: ManifestIcon[]; assets?: WebpackAsset[] }> {
  if (!inputIcons.length) {
    return {};
  }

  if (!(await isAvailableAsync())) {
    // TODO: Bacon: Fallback to nodejs image resizing as native doesn't work in the host environment.
    console.log();
    console.log(
      chalk.bgRed.black(
        `PWA Error: It was not possible to generate the images for your progressive web app (splash screens and icons) because the host computer does not have \`sharp\` installed, and \`image-utils\` was unable to install it automatically.`
      )
    );
    console.log(
      chalk.red(
        `- You may stop the process and try again after successfully running \`npm install -g sharp\`.\n- If you are using \`expo-cli\` to build your project then you could use the \`--no-pwa\` flag to skip the PWA asset generation step entirely.`
      )
    );
    return {};
  }

  const icons: ManifestIcon[] = [];
  const assets: WebpackAsset[] = [];

  let promises: Promise<any>[] = [];

  for (const icon of inputIcons) {
    const cacheKey = createCacheKey(icon);
    if (!(cacheKey in cacheKeys)) {
      cacheKeys[cacheKey] = await ensureCacheDirectory(projectRoot, cacheKey);
    }

    const { sizes } = icon;
    promises = [
      ...promises,
      ...sizes!.map(async size => {
        const { manifestIcon, webpackAsset } = await processImageAsync(
          size,
          icon,
          publicPath,
          cacheKey
        );
        icons.push(manifestIcon);
        assets.push(webpackAsset);
      }),
    ];
  }
  await Promise.all(promises);

  await clearUnusedCachesAsync(projectRoot);

  return {
    icons: sortByAttribute(icons, 'sizes'),
    // startupImages: icons.filter(({ isStartupImage }) => isStartupImage),
    assets: sortByAttribute(assets, 'output'),
  };
}

function sortByAttribute(arr: any[], key: string): any[] {
  return arr.filter(Boolean).sort((valueA, valueB) => {
    if (valueA[key] < valueB[key]) return -1;
    else if (valueA[key] > valueB[key]) return 1;
    return 0;
  });
}

async function clearUnusedCachesAsync(projectRoot: string): Promise<void> {
  // Clean up any old caches
  const cacheFolder = path.join(projectRoot, '.expo/web/cache/production/images');
  const currentCaches = await fs.readdir(cacheFolder);

  const deleteCachePromises: Promise<void>[] = [];
  for (const cache of currentCaches) {
    // skip hidden folders
    if (cache.startsWith('.')) {
      continue;
    }

    // delete
    if (!(cache in cacheKeys)) {
      deleteCachePromises.push(fs.remove(path.join(cacheFolder, cache)));
    }
  }

  await Promise.all(deleteCachePromises);
}
