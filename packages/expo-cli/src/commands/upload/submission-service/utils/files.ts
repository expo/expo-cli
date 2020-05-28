import stream from 'stream';
import { promisify } from 'util';

import fs from 'fs-extra';
import got, { Progress } from 'got';
import ProgressBar from 'progress';

import { UploadType, uploadAsync } from '../../../../uploads';

const pipeline = promisify(stream.pipeline);

async function downloadAppArchiveAsync(url: string, dest: string): Promise<string> {
  const downloadStream = got.stream(url).on('downloadProgress', trackProgress());
  await pipeline(downloadStream, fs.createWriteStream(dest));
  return dest;
}

async function uploadAppArchiveAsync(path: string): Promise<string> {
  const fileSize = (await fs.stat(path)).size;
  return await uploadAsync(UploadType.SUBMISSION_APP_ARCHIVE, path, trackProgress(fileSize));
}

type ProgressTracker = (progress: Progress) => void;

function trackProgress(_total?: number): ProgressTracker {
  let bar: ProgressBar | null = null;
  let transferredSoFar = 0;
  return (progress: Progress) => {
    if (!bar && (progress.total !== undefined || _total !== undefined)) {
      const total = (_total ?? progress.total) as number;
      bar = new ProgressBar('[:bar] :percent :etas', {
        complete: '=',
        incomplete: ' ',
        total,
      });
    }
    if (bar) {
      bar.tick(progress.transferred - transferredSoFar);
    }
    transferredSoFar = progress.transferred;
  };
}

export { downloadAppArchiveAsync, uploadAppArchiveAsync };
