import Jimp from 'jimp';

import { IconError } from './Errors';

const ASPECT_FILL = 'cover';
const ASPECT_FIT = 'contain';

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

async function compositeImagesAsync(image: Jimp, ...images: Jimp[]): Promise<Jimp> {
  for (const imageProps of images) {
    const childImage = await Jimp.read(imageProps);
    image.composite(childImage, 0, 0);
  }
  return image;
}

export async function resize(
  inputPath: string,
  mimeType: string,
  width: number,
  height: number,
  fit: string = 'contain',
  background: string
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
      const resizedImage = await initialImage.contain(width, height, center).quality(100);
      if (!background) {
        return resizedImage.getBufferAsync(mimeType);
      }

      const splashScreen = await createBaseImageAsync(width, height, background);
      const combinedImage = await compositeImagesAsync(splashScreen, resizedImage);
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
