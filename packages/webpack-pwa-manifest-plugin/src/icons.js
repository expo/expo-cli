import fs from 'fs';
import jimp from 'jimp';
import mime from 'mime';
import { joinURI } from './helpers/uri';
import generateFingerprint from './helpers/fingerprint';
import IconError from './errors/IconError';
import { fromStartupImage } from './validators/Apple';

const supportedMimeTypes = [jimp.MIME_PNG, jimp.MIME_JPEG, jimp.MIME_BMP];

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
      color: icon.color,
    },
  };
}

function processImg(
  sizes,
  icon,
  cachedIconsCopy,
  icons,
  assets,
  fingerprint,
  publicPath,
  callback
) {
  const processNext = function() {
    if (sizes.length > 0) {
      return processImg(
        sizes,
        icon,
        cachedIconsCopy,
        icons,
        assets,
        fingerprint,
        publicPath,
        callback
      ); // next size
    } else if (cachedIconsCopy.length > 0) {
      const next = cachedIconsCopy.pop();
      return processImg(
        next.sizes,
        next,
        cachedIconsCopy,
        icons,
        assets,
        fingerprint,
        publicPath,
        callback
      ); // next icon
    } else {
      return callback(null, { icons, assets }); // there are no more icons left
    }
  };

  const size = sizes.pop();

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

  if (width > 0 && height > 0) {
    const mimeType = mime.getType(icon.src);
    if (!supportedMimeTypes.includes(mimeType)) {
      let buffer;
      try {
        buffer = fs.readFileSync(icon.src);
      } catch (err) {
        throw new IconError(`It was not possible to read '${icon.src}'.`);
      }
      const processedIcon = processIcon(
        width,
        height,
        icon,
        buffer,
        mimeType,
        publicPath,
        fingerprint
      );
      icons.push(processedIcon.manifestIcon);
      assets.push(processedIcon.webpackAsset);
      return processNext();
    }

    jimp.read(icon.src, (err, img) => {
      if (err) throw new IconError(`It was not possible to read '${icon.src}'.`);
      img.cover(width, height).getBuffer(mimeType, (err, buffer) => {
        if (err) throw new IconError(`It was not possible to retrieve buffer of '${icon.src}'.`);
        const processedIcon = processIcon(
          width,
          height,
          icon,
          buffer,
          mimeType,
          publicPath,
          fingerprint
        );
        icons.push(processedIcon.manifestIcon);
        assets.push(processedIcon.webpackAsset);
        return processNext();
      });
    });
  }
}

export function retrieveIcons(options) {
  const startupImages = parseArray(options.startupImages);

  let icons = parseArray(options.icon || options.icons);

  if (startupImages.length) {
    const startupImage = startupImages[0];
    icons = icons.concat(fromStartupImage(startupImage));
  }
  const response = [];

  for (let icon of icons) {
    response.push(sanitizeIcon(icon));
  }

  delete options.startupImages;
  delete options.icon;
  delete options.icons;
  return response;
}

export function parseIcons(fingerprint, publicPath, icons, callback) {
  if (icons.length === 0) {
    callback(null, {});
  } else {
    const first = icons.pop();
    processImg(first.sizes, first, icons, [], [], fingerprint, publicPath, callback);
  }
}
