import stream from 'stream';
import { promisify } from 'util';

import fs from 'fs-extra';
import got from 'got';

import { UploadType, uploadAsync } from '../../../../uploads';
import { createProgressTracker } from '../../../utils/progress';

const pipeline = promisify(stream.pipeline);

async function downloadAppArchiveAsync(url: string, dest: string): Promise<string> {
  const downloadStream = got.stream(url).on('downloadProgress', createProgressTracker());
  await pipeline(downloadStream, fs.createWriteStream(dest));
  return dest;
}

async function uploadAppArchiveAsync(path: string): Promise<string> {
  const fileSize = (await fs.stat(path)).size;
  return await uploadAsync(
    UploadType.SUBMISSION_APP_ARCHIVE,
    path,
    createProgressTracker(fileSize)
  );
}

export { downloadAppArchiveAsync, uploadAppArchiveAsync };
