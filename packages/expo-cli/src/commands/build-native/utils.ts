import { JSONObject } from '@expo/json-file';
import spawnAsync from '@expo/spawn-async';
import { TurtleApi } from '@expo/xdl';
import delayAsync from 'delay-async';
import ora from 'ora';

import log from '../../log';
import { BuildInfo } from './Builder';

const table: any = require('../utils/cli-table.js');

async function waitForBuildEnd(client: TurtleApi, buildId: string, { timeoutSec = 1800, intervalSec = 30 } = {}) {
  log('Waiting for build to complete. You can press Ctrl+C to exit.');
  const spinner = ora().start();
  let time = new Date().getTime();
  const endTime = time + timeoutSec * 1000;
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
    await delayAsync(intervalSec * 1000);
  }
  spinner.warn('Timed out.');
  throw new Error(
    'Timeout reached! It is taking longer than expected to finish the build, aborting...'
  );
}

async function makeProjectTarball(tarPath: string) {
  const spinner = ora().start();
  spinner.text = 'Making project tarball';
  const changes = (await spawnAsync('git', ['status', '-s'])).stdout;
  if (changes.length > 0) {
    spinner.fail('Could not make project tarball');
    throw new Error(
      'Please commit all files before trying to build your project. Aborting...'
    );
  }
  await spawnAsync('git', ['archive', '--format=tar.gz', '--prefix', 'project/', '-o', tarPath, 'HEAD']);
  spinner.succeed('Tarball created.');
}

function printBuildTable(builds: BuildInfo[]) {
  const headers = ['platform', 'status', 'artifacts'];
  const colWidths = [10, 15, 80];
  const refactoredBuilds = builds.map(build => ({
    ...build,
    artifacts: build.artifacts ? build.artifacts.s3Url : 'not available',
  }));
  const buildTable = table.printTableJsonArray(headers, refactoredBuilds, colWidths);
  console.log(buildTable);
}

export { waitForBuildEnd, makeProjectTarball, printBuildTable };
