import chalk from 'chalk';
import mime from 'mime';

import * as Cache from './Cache';
import * as Download from './Download';
import * as Ico from './Ico';
import { ImageOptions } from './Image.types';
import * as Jimp from './jimp';
import * as Sharp from './sharp';

const supportedMimeTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

let hasWarned: boolean = false;

async function resizeImagesAsync(buffer: Buffer, sizes: number[]): Promise<Buffer[]> {
  const sharp = await getSharpAsync();
  if (!sharp) {
    return Jimp.resizeBufferAsync(buffer, sizes);
  }
  return Sharp.resizeBufferAsync(buffer, sizes);
}

async function resizeAsync(imageOptions: ImageOptions): Promise<Buffer> {
  let sharp: any = await getSharpAsync();
  const { width, height, backgroundColor, resizeMode } = imageOptions;
  if (!sharp) {
    const inputOptions: any = { input: imageOptions.src, quality: 100 };
    const jimp = await Jimp.resize(inputOptions, {
      width,
      height,
      fit: resizeMode,
      background: backgroundColor,
    });
    const imgBuffer = await jimp.getBufferAsync(jimp.getMIME());
    return imgBuffer;
  }
  try {
    let sharpBuffer = sharp(imageOptions.src)
      .ensureAlpha()
      .resize(width, height, { fit: resizeMode, background: 'transparent' });

    // Skip an extra step if the background is explicitly transparent.
    if (backgroundColor && backgroundColor !== 'transparent') {
      // Add the background color to the image
      sharpBuffer = sharpBuffer.composite([
        {
          // create a background color
          input: {
            create: {
              width,
              height,
              // allow alpha colors
              channels: 4,
              background: backgroundColor,
            },
          },
          // dest-over makes the first image (input) appear on top of the created image (background color)
          blend: 'dest-over',
        },
      ]);
    }

    return await sharpBuffer.png().toBuffer();
  } catch ({ message }) {
    throw new Error(
      `It was not possible to generate splash screen '${imageOptions.src}'. ${message}`
    );
  }
}

async function getSharpAsync(): Promise<any> {
  let sharp: any;
  if (await Sharp.isAvailableAsync()) sharp = await Sharp.findSharpInstanceAsync();
  return sharp;
}

function getDimensionsId(imageOptions: Pick<ImageOptions, 'width' | 'height'>): string {
  return imageOptions.width === imageOptions.height
    ? `${imageOptions.width}`
    : `${imageOptions.width}x${imageOptions.height}`;
}

async function maybeWarnAboutInstallingSharpAsync() {
  // Putting the warning here will prevent the warning from showing if all images were reused from the cache
  if (!hasWarned && !(await Sharp.isAvailableAsync())) {
    hasWarned = true;
    console.log();
    console.log(
      chalk.bgYellow.black(
        `Using node to generate images. This is much slower than using native packages.`
      )
    );
    console.log(
      chalk.yellow(
        `\u203A Optionally you can stop the process and try again after successfully running \`npm install -g sharp-cli\`.\n\u203A If you are using \`expo-cli\` to build your project then you could use the \`--no-pwa\` flag to skip the PWA asset generation step entirely.`
      )
    );
  }
}

async function ensureImageOptionsAsync(imageOptions: ImageOptions): Promise<ImageOptions> {
  const icon = {
    ...imageOptions,
    src: await Download.downloadOrUseCachedImage(imageOptions.src),
  };

  const mimeType = mime.getType(icon.src);

  if (!mimeType) {
    throw new Error(`Invalid mimeType for image with source: ${icon.src}`);
  }
  if (!supportedMimeTypes.includes(mimeType)) {
    throw new Error(`Supplied image is not a supported image type: ${imageOptions.src}`);
  }

  if (!icon.name) {
    icon.name = `icon_${getDimensionsId(imageOptions)}.${mime.getExtension(mimeType)}`;
  }

  return icon;
}

export async function generateImageAsync(
  options: { projectRoot: string; cacheType: string },
  imageOptions: ImageOptions
): Promise<{ source: Buffer; name: string }> {
  const icon = await ensureImageOptionsAsync(imageOptions);

  const cacheKey = await Cache.createCacheKeyWithDirectoryAsync(
    options.projectRoot,
    options.cacheType,
    icon
  );

  const name = icon.name!;
  let source: Buffer | null = await Cache.getImageFromCacheAsync(name, cacheKey);

  if (!source) {
    await maybeWarnAboutInstallingSharpAsync();
    source = await resizeAsync(icon);
    await Cache.cacheImageAsync(name, source, cacheKey);
  }

  return { name, source };
}

export async function generateFaviconAsync(
  pngImageBuffer: Buffer,
  sizes: number[] = [16, 32, 48]
): Promise<Buffer> {
  const buffers = await resizeImagesAsync(pngImageBuffer, sizes);
  return await Ico.generateAsync(buffers);
}
