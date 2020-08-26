import { ExponentTools } from '@expo/xdl';
import fs from 'fs-extra';
import { sync as globSync } from 'glob';
import got from 'got';
import Request from 'got/dist/source/core';
import { dirname, extname } from 'path';
import ProgressBar from 'progress';
import stream from 'stream';
import tar from 'tar';
import { promisify } from 'util';

const { spawnAsyncThrowError } = ExponentTools;
const pipeline = promisify(stream.pipeline);

export async function moveFileOfTypeAsync(
  directory: string,
  extension: string,
  dest: string
): Promise<string> {
  const [matching] = globSync(`*.${extension}`, {
    absolute: true,
    cwd: directory,
  });

  if (!matching) {
    throw new Error(`No .${extension} files found in directory: ${directory}`);
  }

  // The incoming destination may be tar.gz because it wasn't clear what type of app file was included.
  // Compare the app file extension with the destination extension and if they don't match,
  // append the app file extension to the destination. Ex. App.tar.gz.ipa
  const matchingExtension = extname(matching).toLowerCase();
  const destExtension = extname(dest).toLowerCase();

  if (matchingExtension !== destExtension) {
    dest = `${dest}${matchingExtension}`;
  }

  // Ensure we actually need to move the file.
  if (matching !== dest) {
    await fs.move(matching, dest);
  }

  return dest;
}

function createDownloadStream(url: string): Request {
  let bar: ProgressBar | null;
  let transferredSoFar = 0;
  return got.stream(url).on('downloadProgress', progress => {
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
}

export async function extractLocalEASArtifactAsync(
  filePath: string,
  extractedDest: string
): Promise<string> {
  if (!filePath.endsWith('tar.gz')) {
    // No need to extract, copy, or rename the file.
    // Leave it in place and return the path.
    return filePath;
  }
  // Special use-case for downloading an EAS tar.gz file and unpackaging it.
  const dir = dirname(extractedDest);
  await pipeline(fs.createReadStream(filePath), tar.extract({ cwd: dir }, []));
  // Move the folder contents matching ipa or apk.
  return await moveFileOfTypeAsync(dir, '{ipa,apk}', extractedDest);
}

export async function downloadEASArtifact(url: string, dest: string): Promise<string> {
  const downloadStream = createDownloadStream(url);
  // Special use-case for downloading an EAS tar.gz file and unpackaging it.
  if (url.endsWith('tar.gz')) {
    const dir = dirname(dest);
    await pipeline(downloadStream, tar.extract({ cwd: dir }, []));
    // Move the folder contents matching ipa or apk.
    return await moveFileOfTypeAsync(dir, '{ipa,apk}', dest);
  } else {
    await pipeline(downloadStream, fs.createWriteStream(dest));
  }
  return dest;
}

export async function downloadFile(url: string, dest: string): Promise<string> {
  const downloadStream = createDownloadStream(url);
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
        : res.rawDump?.message ?? 'Unknown error when running fastlane';
    message = `${message}${
      res?.rawDump?.backtrace
        ? `\n${res.rawDump.backtrace.map((i: string) => `    ${i}`).join('\n')}`
        : ''
    }`;
    throw new Error(message);
  }
}
