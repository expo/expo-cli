import fs from 'fs-extra';
import mime from 'mime';
import fetch from 'node-fetch';
import path from 'path';
import stream from 'stream';
import temporary from 'tempy';
import util from 'util';
import { sharpAsync } from '@expo/image-utils';

import { joinURI } from './helpers/uri';
import generateFingerprint from './helpers/fingerprint';
import IconError from './errors/IconError';
import { fromStartupImage } from './validators/Apple';

const supportedMimeTypes = ['image/png', 'image/jpeg', 'image/webp'];

function parseArray(i) {
  if (i == null) return [];
  return i && !Array.isArray(i) ? [i] : i;
}

function sanitizeIcon(iconSnippet) {
  if (!iconSnippet.src) {
    throw new IconError('Unknown icon source.');
  }
  const sizes = parseArray(iconSnippet.size || iconSnippet.sizes);
  if (!sizes) {
    throw new IconError('Unknown icon sizes.');
  }
  return {
    src: iconSnippet.src,
    resizeMode: iconSnippet.resizeMode,
    sizes,
    media: iconSnippet.media,
    destination: iconSnippet.destination,
    ios: iconSnippet.ios || false,
    color: iconSnippet.color,
  };
}

function processIcon(width, height, icon, buffer, mimeType, publicPath, shouldFingerprint) {
  const dimensions = `${width}x${height}`;
  const fileName = shouldFingerprint
    ? `icon_${dimensions}.${generateFingerprint(buffer)}.${mime.getExtension(mimeType)}`
    : `icon_${dimensions}.${mime.getExtension(mimeType)}`;
  const iconOutputDir = icon.destination ? joinURI(icon.destination, fileName) : fileName;
  const iconPublicUrl = joinURI(publicPath, iconOutputDir);

  let manifestIcon = null;
  if (width === height) {
    manifestIcon = {
      src: iconPublicUrl,
      sizes: dimensions,
      type: mimeType,
    };
  }
  return {
    manifestIcon,
    webpackAsset: {
      output: iconOutputDir,
      url: iconPublicUrl,
      source: buffer,
      size: buffer.length,
      ios: icon.ios
        ? { valid: icon.ios, media: icon.media, size: dimensions, href: iconPublicUrl }
        : false,
      resizeMode: icon.resizeMode,
      color: icon.color,
    },
  };
}

function parseSize(size) {
  let width;
  let height;
  if (Array.isArray(size) && size.length) {
    // [0, 0] || [0]
    width = size[0];
    height = size.length > 1 ? size[1] : size[0];
  } else if (typeof size === 'number') {
    // 0
    width = size;
    height = size;
  } else if (typeof size === 'string') {
    // '0x0'
    const dimensions = size.split('x');
    width = dimensions[0];
    height = dimensions[1];
  }
  return { width, height };
}

async function getBufferWithMimeAsync({ src, resizeMode, color }, mimeType, { width, height }) {
  let imagePath;
  if (!supportedMimeTypes.includes(mimeType)) {
    imagePath = src;
  } else {
    let localSrc = src;

    // In case the icon is a remote URL we need to download it first
    if (src.startsWith('http')) {
      localSrc = await downloadImage(src);
    }

    imagePath = await resize(localSrc, mimeType, width, height, resizeMode, color);
  }
  try {
    return await fs.readFile(imagePath);
  } catch (err) {
    throw new IconError(`It was not possible to read '${src}'.`);
  }
}

async function downloadImage(url) {
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

async function processImage(size, icon, fingerprint, publicPath) {
  const { width, height } = parseSize(size);
  if (width <= 0 || height <= 0) {
    return;
  }
  const mimeType = mime.getType(icon.src);
  const _buffer = await getBufferWithMimeAsync(icon, mimeType, { width, height });
  return processIcon(width, height, icon, _buffer, mimeType, publicPath, fingerprint);
}

async function resize(inputPath, mimeType, width, height, fit = 'contain', background) {
  try {
    const outputPath = temporary.directory();
    await sharpAsync(
      {
        input: inputPath,
        output: outputPath,
        format: mimeType.split('/')[1],
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

export function retrieveIcons(manifest) {
  // Remove these items so they aren't written to disk.
  const { startupImages, icons, ...config } = manifest;
  const parsedStartupImages = parseArray(startupImages);

  let parsedIcons = parseArray(icons);

  if (parsedStartupImages.length) {
    // TODO: Bacon: use all of the startup images
    const startupImage = parsedStartupImages[0];
    parsedIcons = [...parsedIcons, ...fromStartupImage(startupImage)];
  }

  const response = parsedIcons.map(icon => sanitizeIcon(icon));
  return [response, config];
}

export async function parseIcons(inputIcons, fingerprint, publicPath) {
  if (!inputIcons.length) {
    return {};
  }

  let icons = [];
  let assets = [];

  let promises = [];
  for (const icon of inputIcons) {
    const { sizes } = icon;
    promises = [
      ...promises,
      ...sizes.map(async size => {
        const { manifestIcon, webpackAsset } = await processImage(
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
