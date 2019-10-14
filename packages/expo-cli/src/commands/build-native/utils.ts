import { JSONObject } from '@expo/json-file';
import spawnAsync from '@expo/spawn-async';
import { TurtleApi } from '@expo/xdl';
import delayAsync from 'delay-async';
import ora from 'ora';

import log from '../../log';

export interface ProjectConfig {
  data: Buffer;
  headers: JSONObject;
}

async function waitForBuildEnd(client: TurtleApi, buildId: string, { timeout = 1800, interval = 30 } = {}) {
  log(`Waiting for build to complete. You can press Ctrl+C to exit.`);
  let spinner = ora().start();
  let time = new Date().getTime();
  const endTime = time + timeout * 1000;
  while (time <= endTime) {
    const buildInfo = await client.getAsync(`build/status/${buildId}`);
    switch (buildInfo.status) {
      case 'finished':
        spinner.succeed('Build finished.');
        return buildInfo.artifacts ? buildInfo.artifacts.s3Url : '';
      case 'in-queue':
        spinner.text = 'Build queued...';
        break;
      case 'in-progress':
        spinner.text = 'Build in progress...';
        break;
      case 'errored':
        spinner.fail('Build failed.');
        throw new Error(`Standalone build failed!`);
      default:
        spinner.warn('Unknown status.');
        throw new Error(`Unknown status: ${buildInfo} - aborting!`);
    }
    time = new Date().getTime();
    await delayAsync(interval * 1000);
  }
  spinner.warn('Timed out.');
  throw new Error(
    'Timeout reached! Project is taking longer than expected to finish building, aborting wait...'
  );
}

async function makeProjectTarball(tarPath: string) {
  const changes = (await spawnAsync('git', ['status', '-s'])).stdout;
  if (changes.length > 0) {
    throw new Error(
      'Commit all files before trying to build your project. Aborting...'
    );
  }
  await spawnAsync('git', ['archive', '--format=tar.gz', '--prefix', 'project/', '-o', `${tarPath}`, 'HEAD']);
}

export { waitForBuildEnd, makeProjectTarball };
