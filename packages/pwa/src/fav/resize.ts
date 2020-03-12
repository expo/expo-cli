import { ImageFormat, ResizeMode, isAvailableAsync, sharpAsync } from '@expo/image-utils';
import fs from 'fs-extra';
import Jimp from 'jimp';
import * as path from 'path';
import temporary from 'tempy';

const ASPECT_FILL = 'cover';
const ASPECT_FIT = 'contain';
class IconError extends Error {}

function ensureValidMimeType(mimeType: string): ImageFormat {
  if (['input', 'jpeg', 'jpg', 'png', 'raw', 'tiff', 'webp'].includes(mimeType)) {
    return mimeType as ImageFormat;
  }
  return 'png';
}

async function createBaseImageAsync(width: number, height: number, color: string): Promise<Jimp> {
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

async function compositeImagesAsync(
  image: Jimp,
  padding: number = 0,
  ...images: Jimp[]
): Promise<Jimp> {
  for (const imageProps of images) {
    const childImage = await Jimp.read(imageProps);
    image.composite(childImage, padding, padding);
  }
  return image;
}

export async function resize(
  inputPath: string,
  mimeType: string,
  width: number,
  height: number,
  fit: string = 'contain',
  background: string,
  padding: number = 0
): Promise<Buffer> {
  try {
    const initialImage = await Jimp.read(inputPath);
    const center = Jimp.VERTICAL_ALIGN_MIDDLE | Jimp.HORIZONTAL_ALIGN_CENTER;
    if (fit === ASPECT_FILL) {
      return await initialImage
        .cover(width, height, center)
        .quality(100)
        .getBufferAsync(mimeType);
    } else if (fit === ASPECT_FIT) {
      const resizedImage = await initialImage
        .contain(width - padding, height - padding, center)
        .quality(100);
      if (!background) {
        return resizedImage.getBufferAsync(mimeType);
      }

      const splashScreen = await createBaseImageAsync(width, height, background);
      const combinedImage = await compositeImagesAsync(splashScreen, padding, resizedImage);
      return combinedImage.getBufferAsync(mimeType);
    } else {
      throw new IconError(
        `Unsupported resize mode: ${fit}. Please choose either 'cover', or 'contain'`
      );
    }
  } catch ({ message }) {
    throw new IconError(`It was not possible to generate splash screen '${inputPath}'. ${message}`);
  }
}

export async function resizeIconAsync(
  source: string,
  size: number,
  outputPath?: string,
  padding: number = 0,
  background: string = 'white',
  resizeMode: any = 'contain'
) {
  return resizeAsync(source, 'image/png', size, size, resizeMode, background, padding, outputPath);
}

export default async function resizeAsync(
  inputPath: string,
  mimeType: string,
  width: number,
  height: number,
  fit: ResizeMode = 'contain',
  background: string,
  padding: number = 0,
  outputPath?: string
): Promise<string | Buffer> {
  const _outputPath = outputPath || temporary.directory();
  if (!(await isAvailableAsync())) {
    const buff = await resize(inputPath, mimeType, width, height, fit, background, padding);
    await fs.writeFile(_outputPath, buff);
    return _outputPath;
  }

  const format = ensureValidMimeType(mimeType.split('/')[1]);

  try {
    await sharpAsync(
      {
        input: inputPath,
        output: _outputPath,
        format,
      },
      [
        {
          operation: 'flatten',
          background,
        },
        {
          operation: 'resize',
          width: width - padding * 2,
          height: height - padding * 2,
          fit,
          background,
        },
        padding && {
          operation: 'extend',
          background: 'transparent',
          top: padding,
          left: padding,
          bottom: padding,
          right: padding,
        },
      ].filter(Boolean) as any
    );

    return path.join(_outputPath, path.basename(inputPath));
  } catch ({ message }) {
    throw new IconError(`It was not possible to generate splash screen '${inputPath}'. ${message}`);
  }
}
