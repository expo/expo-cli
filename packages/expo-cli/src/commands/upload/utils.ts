import { ExponentTools } from '@expo/xdl';
import get from 'lodash/get';
import fs from 'fs-extra';
import ProgressBar from 'progress';
import axios from 'axios';

const { spawnAsyncThrowError } = ExponentTools;

export async function downloadFile(url: string, dest: string): Promise<string> {
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

export async function runFastlaneAsync(
  program: string,
  args: any,
  {
    appleId,
    appleIdPassword,
    appleTeamId,
    itcTeamId,
  }: { appleId?: string; appleIdPassword?: string; appleTeamId?: string; itcTeamId?: string },
  pipeToLogger = false
): Promise<{ [key: string]: any }> {
  const pipeToLoggerOptions: any = pipeToLogger
    ? { pipeToLogger: { stdout: true } }
    : { stdio: [0, 1, 'pipe'] };

  const fastlaneData =
    appleId && appleIdPassword
      ? {
          FASTLANE_USER: appleId,
          FASTLANE_PASSWORD: appleIdPassword,
          FASTLANE_DONT_STORE_PASSWORD: '1',
          FASTLANE_TEAM_ID: appleTeamId,
          FASTLANE_ITC_TEAM_ID: itcTeamId ? itcTeamId : undefined,
        }
      : {};

  const env = {
    ...process.env,
    ...fastlaneData,
  };

  const spawnOptions: ExponentTools.AsyncSpawnOptions = {
    ...pipeToLoggerOptions,
    env,
  };

  const { stderr } = await spawnAsyncThrowError(program, args, spawnOptions);

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
