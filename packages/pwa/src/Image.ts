import { ImageFormat, ResizeMode, isAvailableAsync, sharpAsync } from '@expo/image-utils';
import chalk from 'chalk';
import fs from 'fs-extra';
import mime from 'mime';
import path from 'path';
import temporary from 'tempy';

import * as Cache from './Cache';
import * as Download from './Download';
import { resize as jimpResize } from './Jimp';

export type Icon = {
  src: string;
  name?: string;
  resizeMode: ResizeMode;
  backgroundColor: string;
  width: number;
  height: number;
};

const supportedMimeTypes = ['image/png', 'image/jpeg', 'image/webp'];

async function getBufferWithMimeAsync(
  { src, resizeMode, backgroundColor, width, height }: Icon,
  mimeType: string
): Promise<Buffer> {
  let imagePath;
  if (!supportedMimeTypes.includes(mimeType)) {
    imagePath = src;
  } else {
    const imageData = await resize(src, mimeType, width, height, resizeMode, backgroundColor!);
    if (imageData instanceof Buffer) {
      return imageData;
    } else {
      imagePath = imageData;
    }
  }
  try {
    return await fs.readFile(imagePath);
  } catch (err) {
    throw new Error(`It was not possible to read '${src}'.`);
  }
}

let hasWarned: boolean = false;

function ensureValidMimeType(mimeType: string): ImageFormat {
  if (['input', 'jpeg', 'jpg', 'png', 'raw', 'tiff', 'webp'].includes(mimeType)) {
    return mimeType as ImageFormat;
  }
  return 'png';
}

async function resize(
  inputPath: string,
  mimeType: string,
  width: number,
  height: number,
  fit: ResizeMode = 'contain',
  background: string
): Promise<string | Buffer> {
  if (!(await isAvailableAsync())) {
    return await jimpResize(inputPath, mimeType, width, height, fit, background);
  }

  const format = ensureValidMimeType(mimeType.split('/')[1]);
  const outputPath = temporary.directory();

  try {
    await sharpAsync(
      {
        input: inputPath,
        output: outputPath,
        format,
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
          `- Optionally you can stop the process and try again after successfully running \`npm install -g sharp-cli\`.\n- If you are using \`expo-cli\` to build your project then you could use the \`--no-pwa\` flag to skip the PWA asset generation step entirely.`
        )
      );
    }
    imageBuffer = await getBufferWithMimeAsync(icon, mimeType);

    await Cache.cacheImageAsync(fileName, imageBuffer!, cacheKey);
  }

  return { source: imageBuffer, name: fileName };
}

// await Cache.clearUnusedCachesAsync(projectRoot, type);
