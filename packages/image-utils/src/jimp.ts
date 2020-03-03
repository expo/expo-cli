import fs from 'fs-extra';
import Jimp from 'jimp';

import {
  FlattenOptions,
  Position,
  ResizeOptions,
  SharpCommandOptions,
  SharpGlobalOptions,
} from './sharp.types';

type JimpGlobalOptions = Omit<SharpGlobalOptions, 'input'> & { input: string | Buffer | Jimp };

export async function jimpAsync(
  options: JimpGlobalOptions,
  commands: SharpCommandOptions[] = []
): Promise<Buffer> {
  if (commands.length) {
    const command = commands.shift();
    if (command) {
      let input: Jimp;
      if (command.operation === 'resize') {
        input = await resize(options, command);
      } else if (command.operation === 'flatten') {
        input = await flatten(options, command);
      } else {
        throw new Error(`The operation: '${command.operation}' is not supported with Jimp`);
      }
      // @ts-ignore
      return jimpAsync({ ...options, input }, commands);
    }
  }

  const image = await getJimpImageAsync(options.input);
  const mime = typeof options.format === 'string' ? options.format : image.getMIME();
  const imgBuffer = await image.getBufferAsync(mime);

  if (typeof options.output === 'string') {
    await fs.writeFile(imgBuffer, options.input);
  }
  return imgBuffer;
}

async function getJimpImageAsync(input: string | Buffer | Jimp): Promise<Jimp> {
  // @ts-ignore: Jimp types are broken
  if (typeof input === 'string' || input instanceof Buffer) return Jimp.read(input);

  return input;
}

export async function resize(
  { input, quality = 100 }: JimpGlobalOptions,
  { background, position, fit, width, height = Jimp.AUTO }: Omit<ResizeOptions, 'operation'>
): Promise<Jimp> {
  const initialImage = await getJimpImageAsync(input);
  const jimpPosition = convertPosition(position);
  const jimpQuality = typeof quality !== 'number' ? 100 : quality;
  if (fit === 'cover') {
    return await initialImage.cover(width, height, jimpPosition).quality(jimpQuality);
  } else if (fit === 'contain') {
    let resizedImage = await initialImage.contain(width, height, jimpPosition).quality(jimpQuality);
    if (background) {
      resizedImage = await resizedImage.background(Jimp.cssColorToHex(background));
    }
    return resizedImage;
    //   const canvas = await createBaseImageAsync(width, height, background);
    //   const combinedImage = await compositeImagesAsync(canvas, resizedImage);
    //   return combinedImage.getBufferAsync(mime);
  } else {
    throw new Error(
      `Unsupported fit: ${fit}. Please choose either 'cover', or 'contain' when using Jimp`
    );
  }
}

async function flatten(
  { input, quality = 100 }: JimpGlobalOptions,
  { background }: Omit<FlattenOptions, 'operation'>
): Promise<Jimp> {
  const initialImage = await getJimpImageAsync(input);
  const jimpQuality = typeof quality !== 'number' ? 100 : quality;
  return initialImage.quality(jimpQuality).background(Jimp.cssColorToHex(background));
}

/**
 * Convert sharp position to Jimp position.
 *
 * @param position
 */
function convertPosition(position?: Position): number {
  if (!position) return convertPosition('center');

  switch (position) {
    case 'center':
    case 'centre':
      return Jimp.VERTICAL_ALIGN_MIDDLE | Jimp.HORIZONTAL_ALIGN_CENTER;
    case 'north':
    case 'top':
      return Jimp.VERTICAL_ALIGN_TOP | Jimp.HORIZONTAL_ALIGN_CENTER;
    case 'east':
    case 'right':
      return Jimp.VERTICAL_ALIGN_MIDDLE | Jimp.HORIZONTAL_ALIGN_RIGHT;
    case 'south':
    case 'bottom':
      return Jimp.VERTICAL_ALIGN_BOTTOM | Jimp.HORIZONTAL_ALIGN_CENTER;
    case 'west':
    case 'left':
      return Jimp.VERTICAL_ALIGN_MIDDLE | Jimp.HORIZONTAL_ALIGN_LEFT;
    case 'northeast':
    case 'right top':
      return Jimp.VERTICAL_ALIGN_TOP | Jimp.HORIZONTAL_ALIGN_RIGHT;
    case 'southeast':
    case 'right bottom':
      return Jimp.VERTICAL_ALIGN_BOTTOM | Jimp.HORIZONTAL_ALIGN_RIGHT;
    case 'southwest':
    case 'left bottom':
      return Jimp.VERTICAL_ALIGN_BOTTOM | Jimp.HORIZONTAL_ALIGN_LEFT;
    case 'northwest':
    case 'left top':
      return Jimp.VERTICAL_ALIGN_TOP | Jimp.HORIZONTAL_ALIGN_LEFT;
    case 'entropy':
    case 'attention':
      throw new Error(`Position: '${position}' is not supported`);
    default:
      throw new Error(`Unknown position: '${position}'`);
  }
}
