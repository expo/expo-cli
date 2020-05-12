import fs from 'fs';
import axios from 'axios';
import ora from 'ora';
import ProgressBar from 'progress';

import { UploadType, uploadAsync } from '../../../../uploads';

async function downloadAppArchiveAsync(url: string, dest: string): Promise<string> {
  const response = await axios.get(url, { responseType: 'stream' });
  const fileSize = Number(response.headers['content-length']);
  const bar = new ProgressBar('Downloading [:bar] :percent :etas', {
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

// TODO: add progress bar
async function uploadAppArchiveAsync(path: string): Promise<string> {
  const spinner = ora(`Uploading ${path}`).start();
  try {
    const archiveUrl = await uploadAsync(UploadType.SUBMISSION_APP_ARCHIVE, path);
    spinner.succeed();
    return archiveUrl;
  } catch (err) {
    spinner.fail();
    throw err;
  }
}

export { downloadAppArchiveAsync, uploadAppArchiveAsync };
