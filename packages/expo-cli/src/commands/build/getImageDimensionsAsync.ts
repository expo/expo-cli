import fs from 'fs';
import path from 'path';
import getImageSizeAsync from 'probe-image-size';

/**
 * @param {string} projectRoot
 * @param {string} basename
 * @returns {} { width: number, height: number } image dimensions or null
 */
export async function getImageDimensionsAsync(
  projectRoot: string,
  basename: string
): Promise<{ width: number; height: number } | null> {
  try {
    const imagePath = path.resolve(projectRoot, basename);
    const readStream = fs.createReadStream(imagePath);
    const { width, height } = await getImageSizeAsync(readStream);
    readStream.destroy();
    return { width, height };
  } catch {
    return null;
  }
}
