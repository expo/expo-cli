import fs from 'fs-extra';
import Jimp from 'jimp';
import mime from 'mime';
import { joinURI } from './helpers/uri';
import generateFingerprint from './helpers/fingerprint';
import IconError from './errors/IconError';
import { fromStartupImage } from './validators/Apple';

const supportedMimeTypes = [Jimp.MIME_PNG, Jimp.MIME_JPEG, Jimp.MIME_BMP];

const ASPECT_FILL = 'cover';
const ASPECT_FIT = 'contain';

export async function createBaseImageAsync(width, height, color) {
  return new Promise(
    (resolve, reject) =>
      new Jimp(width, height, color, (err, image) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(image);
      })
  );
}

async function ensureImageAsync(image) {
  return await Jimp.read(image);
}

async function compositeImagesAsync(image, props) {
  const images = parseArray(props);
  for (const imageProps of images) {
    const childImage = await ensureImageAsync(imageProps.image);
    image.composite(childImage, imageProps.x || 0, imageProps.y || 0);
  }
  return image;
}

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
  return {
    manifestIcon: {
      src: iconPublicUrl,
      sizes: dimensions,
      type: mimeType,
    },
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

function processNext(sizes, icon, cachedIconsCopy, icons, assets, fingerprint, publicPath) {
  if (sizes.length > 0) {
    return processImg(sizes, icon, cachedIconsCopy, icons, assets, fingerprint, publicPath); // next size
  } else if (cachedIconsCopy.length > 0) {
    const next = cachedIconsCopy.pop();
    return processImg(next.sizes, next, cachedIconsCopy, icons, assets, fingerprint, publicPath); // next icon
  } else {
    return { icons, assets }; // there are no more icons left
  }
}

async function getBufferWithMimeAsync(icon, mimeType, { width, height }) {
  if (!supportedMimeTypes.includes(mimeType)) {
    try {
      return fs.readFileSync(icon.src);
    } catch (err) {
      throw new IconError(`It was not possible to read '${icon.src}'.`);
    }
  } else {
    return await resize(icon.src, mimeType, width, height, icon.resizeMode, icon.color);
  }
}

async function processImg(sizes, icon, cachedIconsCopy, icons, assets, fingerprint, publicPath) {
  const { width, height } = parseSize(sizes.pop());

  if (width <= 0 || height <= 0) {
    return;
  }

  const mimeType = mime.getType(icon.src);
  const _buffer = await getBufferWithMimeAsync(icon, mimeType, { width, height });
  const { manifestIcon, webpackAsset } = processIcon(
    width,
    height,
    icon,
    _buffer,
    mimeType,
    publicPath,
    fingerprint
  );
  icons.push(manifestIcon);
  assets.push(webpackAsset);
  return processNext(sizes, icon, cachedIconsCopy, icons, assets, fingerprint, publicPath);
}
const log = (...p) => console.log('Splashscreen:', ...p);

async function resize(img, mimeType, width, height, resizeMode = 'contain', color) {
  try {
    const initialImage = await Jimp.read(img);
    log({ resizeMode });
    const center = Jimp.VERTICAL_ALIGN_MIDDLE | Jimp.HORIZONTAL_ALIGN_CENTER;
    if (resizeMode === ASPECT_FILL) {
      return await initialImage
        .cover(width, height, center)
        .quality(100)
        .getBufferAsync(mimeType);
    } else if (resizeMode === ASPECT_FIT) {
      const resizedImage = await initialImage.contain(width, height, center).quality(100);
      if (!color) {
        return resizedImage.getBufferAsync(mimeType);
      }

      const splashScreen = await createBaseImageAsync(width, height, color);
      const combinedImage = await compositeImagesAsync(splashScreen, [{ image: resizedImage }]);
      return combinedImage.getBufferAsync(mimeType);
    } else {
      throw new IconError(
        `Unsupported resize mode: ${resizeMode}. Please choose either 'cover', or 'contain'`
      );
    }
  } catch ({ message }) {
    throw new IconError(`It was not possible to generate splash screen '${img}'. ${message}`);
  }
}

export function retrieveIcons(manifest) {
  const { startupImages, icon, icons, ...config } = manifest;
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

export async function parseIcons(fingerprint, publicPath, icons) {
  if (icons.length === 0) {
    return {};
  } else {
    const first = icons.pop();
    const data = await processImg(first.sizes, first, icons, [], [], fingerprint, publicPath);
    return data;
  }
}
