import { ExponentTools } from 'xdl';
import get from 'lodash/get';
import fs from 'fs-extra';
import ProgressBar from 'progress';
import axios from 'axios';

const { spawnAsyncThrowError } = ExponentTools;

export async function downloadFile(url, dest) {
  const response = await axios.get(url, { responseType: 'stream' });
  const fileSize = Number(response.headers['content-length']);
  const bar = new ProgressBar('Downloading [:bar] :percent :etas', {
    complete: '=',
    incomplete: ' ',
    total: fileSize,
  });
  response.data.pipe(fs.createWriteStream(dest));
  return new Promise((resolve, reject) => {
    response.data.on('data', data => bar.tick(data.length));
    response.data.on('end', () => resolve(dest));
    response.data.on('error', reject);
  });
}

export async function runFastlaneAsync(
  program,
  args,
  { appleId, appleIdPassword, appleTeamId },
  pipeToLogger = false
) {
  const { stderr } = await spawnAsyncThrowError(program, args, {
    ...(pipeToLogger ? { pipeToLogger: { stdout: 1 } } : { stdio: 'pipe' }),
    env: {
      ...process.env,
      ...(appleId &&
        appleIdPassword && {
          FASTLANE_USER: appleId,
          FASTLANE_PASSWORD: appleIdPassword,
          FASTLANE_DONT_STORE_PASSWORD: '1',
          FASTLANE_TEAM_ID: appleTeamId,
        }),
    },
  });

  const res = JSON.parse(stderr);
  if (res.result !== 'failure') {
    return res;
  } else {
    const message =
      res.reason !== 'Unknown reason'
        ? res.reason
        : get(res, 'rawDump.message', 'Unknown error when running fastlane');
    throw new Error(message);
  }
}
