import stream from 'stream';
import { promisify } from 'util';

import { ExponentTools } from '@expo/xdl';
import fs from 'fs-extra';
import get from 'lodash/get';
import got from 'got';
import ProgressBar from 'progress';

const { spawnAsyncThrowError } = ExponentTools;
const pipeline = promisify(stream.pipeline);

export async function downloadFile(url: string, dest: string): Promise<string> {
  let bar: ProgressBar | null;
  let transferredSoFar = 0;
  const downloadStream = got.stream(url).on('downloadProgress', progress => {
    if (!bar) {
      bar = new ProgressBar('Downloading [:bar] :percent :etas', {
        complete: '=',
        incomplete: ' ',
        total: progress.total,
      });
    }
    bar.tick(progress.transferred - transferredSoFar);
    transferredSoFar = progress.transferred;
  });
  await pipeline(downloadStream, fs.createWriteStream(dest));
  return dest;
}

export async function runFastlaneAsync(
  program: string,
  args: any,
  {
    appleId,
    appleIdPassword,
    appleTeamId,
    itcTeamId,
    companyName,
  }: {
    appleId?: string;
    appleIdPassword?: string;
    appleTeamId?: string;
    itcTeamId?: string;
    companyName?: string;
  },
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
          ...(itcTeamId && { FASTLANE_ITC_TEAM_ID: itcTeamId }),
          ...(companyName && { PRODUCE_COMPANY_NAME: companyName }),
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
    let message =
      res.reason !== 'Unknown reason'
        ? res.reason
        : get(res, 'rawDump.message', 'Unknown error when running fastlane');
    message = `${message}${
      res?.rawDump?.backtrace
        ? `\n${res.rawDump.backtrace.map((i: string) => `    ${i}`).join('\n')}`
        : ''
    }`;
    throw new Error(message);
  }
}
