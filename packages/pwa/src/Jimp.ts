import Jimp from 'jimp';

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

// TODO(Bacon): Maybe optimize images with jimp too
export async function optimizeAsync(inputPath: string | Buffer, mimeType: string): Promise<Buffer> {
  // @ts-ignore: Jimp types are broken
  const initialImage = await Jimp.read(inputPath);

  return initialImage.getBufferAsync(mimeType);
}

export function cssColorHasTransparency(color: string): boolean {
  const hex = Jimp.cssColorToHex(color);
  const rgba = Jimp.intToRGBA(hex);
  return !rgba.a;
}

export async function resize(
  inputPath: string | Buffer,
  mimeType: string,
  width: number,
  height: number,
  fit: string = 'contain',
  background?: string
): Promise<Buffer> {
  try {
    // @ts-ignore: Jimp types are broken
    const initialImage = await Jimp.read(inputPath);
    const center = Jimp.VERTICAL_ALIGN_MIDDLE | Jimp.HORIZONTAL_ALIGN_CENTER;
    let resizedImage: typeof initialImage;
    if (fit === ASPECT_FILL) {
      resizedImage = await initialImage.cover(width, height, center).quality(100);
    } else if (fit === ASPECT_FIT) {
      resizedImage = await initialImage.contain(width, height, center).quality(100);
    } else {
      throw new Error(
        `Unsupported resize mode: ${fit}. Please choose either 'cover', or 'contain'`
      );
    }
    if (!background) {
      return resizedImage.getBufferAsync(mimeType);
    }

    const splashScreen = await createBaseImageAsync(width, height, background);
    const combinedImage = await compositeImagesAsync(splashScreen, resizedImage);
    return combinedImage.getBufferAsync(mimeType);
  } catch ({ message }) {
    throw new Error(`It was not possible to generate splash screen '${inputPath}'. ${message}`);
  }
}
