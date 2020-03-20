import { convertFormat, jimpAsync } from './jimp';
import { isAvailableAsync, sharpAsync } from './sharp';
import { ImageFormat, ResizeMode, SharpCommandOptions, SharpGlobalOptions } from './sharp.types';

export async function imageAsync(
  options: SharpGlobalOptions,
  commands: SharpCommandOptions[] = []
) {
  if (await isAvailableAsync()) {
    return sharpAsync(options, commands);
  }
  return jimpAsync(
    { ...options, format: convertFormat(options.format), originalInput: options.input },
    commands
  );
}

export { jimpAsync, isAvailableAsync, sharpAsync };

export { SharpGlobalOptions, SharpCommandOptions, ResizeMode, ImageFormat };
