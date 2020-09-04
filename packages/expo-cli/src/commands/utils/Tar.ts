import got from 'got';
import stream from 'stream';
import tar from 'tar';
import { promisify } from 'util';

import { createProgressTracker } from './progress';

const pipeline = promisify(stream.pipeline);

/**
 * Download a tar.gz file and extract it to a folder.
 *
 * @param url remote URL to download.
 * @param destination destination folder to extract the tar to.
 */
export async function downloadAndDecompressAsync(
  url: string,
  destination: string
): Promise<string> {
  const downloadStream = got.stream(url).on('downloadProgress', createProgressTracker());

  await pipeline(downloadStream, tar.extract({ cwd: destination }));
  return destination;
}
