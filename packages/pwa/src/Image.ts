// @ts-ignore
import generateICO from 'to-ico';
import { ResizeMode, findSharpInstanceAsync, isAvailableAsync } from '@expo/image-utils';
import chalk from 'chalk';
import mime from 'mime';

import * as Cache from './Cache';
import * as Download from './Download';
import * as Jimp from './Jimp';
import { Icon } from './Web.types';

const supportedMimeTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

let hasWarned: boolean = false;

async function getBufferWithMimeAsync(
  { src, resizeMode, backgroundColor, width, height }: Icon,
  mimeType: string
): Promise<Buffer> {
  if (!supportedMimeTypes.includes(mimeType)) {
    throw new Error(`Supplied image is not a supported image type: ${src}`);
  }
  const optimizedBuffer = await convertOrUseCachedPNGImage(src);
  return await resize(optimizedBuffer, 'image/png', width, height, resizeMode, backgroundColor);
}

const cacheOptimizedKeys: Record<string, Buffer> = {};

// cache png buffers in memory
export async function convertOrUseCachedPNGImage(url: string): Promise<Buffer> {
  if (url in cacheOptimizedKeys) {
    return cacheOptimizedKeys[url];
  }

  let sharp: any = await getSharpAsync();
  if (!sharp) {
    cacheOptimizedKeys[url] = await Jimp.optimizeAsync(url, 'image/png');
  } else {
    // Return an image buffer for flexibility, adaptiveFiltering helps reduce the size but it also makes compile time a little longer.
    // Only using adaptiveFiltering for larger images
    cacheOptimizedKeys[url] = await sharp(url)
      .ensureAlpha()
      .png()
      .toBuffer();
  }
  return cacheOptimizedKeys[url];
}

async function resize(
  inputPath: string | Buffer,
  mimeType: string,
  width: number,
  height: number,
  fit: ResizeMode = 'contain',
  background?: string
): Promise<Buffer> {
  let sharp: any = await getSharpAsync();
  if (!sharp) {
    return await Jimp.resize(inputPath, mimeType, width, height, fit, background);
  }
  try {
    let sharpBuffer = sharp(inputPath).resize(width, height, { fit, background: 'transparent' });

    // Skip an extra step if the background is explicitly transparent.
    if (background && background !== 'transparent') {
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
              background,
            },
          },
          // dest-over makes the first image (input) appear on top of the created image (background color)
          blend: 'dest-over',
        },
      ]);
    }

    return await sharpBuffer.png().toBuffer();
  } catch ({ message }) {
    throw new Error(`It was not possible to generate splash screen '${inputPath}'. ${message}`);
  }
}

export async function generateImageAsync(
  options: { projectRoot: string; cacheType: string },
  icon: Icon
): Promise<{ source: Buffer; name: string }> {
  const cacheKey = await Cache.createCacheKeyWithDirectoryAsync(
    options.projectRoot,
    options.cacheType,
    icon
  );
  icon.src = await Download.downloadOrUseCachedImage(icon.src);

  const mimeType = mime.getType(icon.src);

  if (!mimeType) {
    throw new Error(`Invalid mimeType for image with source: ${icon.src}`);
  }

  const dimensions = `${icon.width}x${icon.height}`;
  const fileName = icon.name ?? `icon_${dimensions}.${mime.getExtension(mimeType)}`;

  let imageBuffer: Buffer | null = await Cache.getImageFromCacheAsync(fileName, cacheKey);
  if (!imageBuffer) {
    // Putting the warning here will prevent the warning from showing if all images were reused from the cache
    if (!hasWarned && !(await isAvailableAsync())) {
      hasWarned = true;
      console.log();
      console.log(
        chalk.bgYellow.black(
          `PWA Images: Using node to generate images. This is much slower than using native packages.`
        )
      );
      console.log(
        chalk.yellow(
          `\u203A Optionally you can stop the process and try again after successfully running \`npm install -g sharp-cli\`.\n\u203A If you are using \`expo-cli\` to build your project then you could use the \`--no-pwa\` flag to skip the PWA asset generation step entirely.`
        )
      );
    }
    imageBuffer = await getBufferWithMimeAsync(icon, mimeType);

    await Cache.cacheImageAsync(fileName, imageBuffer!, cacheKey);
  }

  return { source: imageBuffer, name: fileName };
}

async function getSharpAsync(): Promise<any> {
  let sharp: any;
  if (await isAvailableAsync()) sharp = await findSharpInstanceAsync();
  return sharp;
}

export async function generateFaviconAsync(
  pngImageBuffer: Buffer,
  dimensions: number[]
): Promise<Buffer> {
  const sharp: any = await getSharpAsync();
  if (!sharp) {
    // No sharp found, use JS to resize the buffers dynamically
    // TODO(Bacon): Reuse the already resized images if possible.
    return await generateICO(pngImageBuffer, {
      sizes: dimensions,
      resize: true,
    });
  }

  const metadata = await sharp(pngImageBuffer).metadata();
  try {
    // Create buffer for each size
    const resizedBuffers = await Promise.all(
      dimensions.map(dimension => {
        const density = (dimension / Math.max(metadata.width, metadata.height)) * metadata.density;
        return sharp(pngImageBuffer, {
          density: isNaN(density) ? undefined : Math.ceil(density),
        })
          .resize(dimension, dimension, { fit: 'contain', background: 'transparent' })
          .toBuffer();
      })
    );

    return await generateICO(resizedBuffers);
  } catch (error) {
    // Give a little more context
    error.message = `Failed to generate Favicon: ${error.message}`;
    throw error;
  }
}
