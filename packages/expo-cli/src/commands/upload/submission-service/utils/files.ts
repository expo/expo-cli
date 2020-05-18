import fs from 'fs-extra';
import axios from 'axios';
import ProgressBar from 'progress';

import { UploadType, uploadAsync } from '../../../../uploads';

async function downloadAppArchiveAsync(url: string, dest: string): Promise<string> {
  const response = await axios.get(url, { responseType: 'stream' });
  const fileSize = Number(response.headers['content-length']);
  const bar = new ProgressBar('[:bar] :percent :etas', {
    complete: '=',
    incomplete: ' ',
    total: fileSize,
  });
  response.data.pipe(fs.createWriteStream(dest));
  return new Promise((resolve, reject): void => {
    response.data.on('data', (data: { length: number }) => bar.tick(data.length));
    response.data.on('end', () => resolve(dest));
    response.data.on('error', reject);
  });
}

async function uploadAppArchiveAsync(path: string): Promise<string> {
  const fileSize = (await fs.stat(path)).size;
  let bar: ProgressBar | null;
  let transferredSoFar = 0;
  const archiveUrl = await uploadAsync(UploadType.SUBMISSION_APP_ARCHIVE, path, progress => {
    if (!bar) {
      bar = new ProgressBar('[:bar] :percent :etas', {
        complete: '=',
        incomplete: ' ',
        total: progress.total || fileSize,
      });
    }
    bar.tick(progress.transferred - transferredSoFar);
    transferredSoFar = progress.transferred;
  });

  return archiveUrl;
}

export { downloadAppArchiveAsync, uploadAppArchiveAsync };
