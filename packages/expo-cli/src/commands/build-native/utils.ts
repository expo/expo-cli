import spawnAsync from '@expo/spawn-async';
import { ApiV2 } from '@expo/xdl';
import fs from 'fs-extra';
import ora from 'ora';

import log from '../../log';
import { printTableJsonArray } from '../utils/cli-table';
import { BuildInfo } from './build';

async function makeProjectTarballAsync(tarPath: string) {
  const spinner = ora('Making project tarball').start();
  const changes = (await spawnAsync('git', ['status', '-s'])).stdout;
  if (changes.length > 0) {
    spinner.fail('Could not make project tarball');
    throw new Error('Please commit all files before trying to build your project. Aborting...');
  }
  await spawnAsync('git', [
    'archive',
    '--format=tar.gz',
    '--prefix',
    'project/',
    '-o',
    tarPath,
    'HEAD',
  ]);
  spinner.succeed('Project tarball created.');

  const { size } = await fs.stat(tarPath);
  return size;
}

function printBuildTable(builds: BuildInfo[]) {
  const headers = ['platform', 'status', 'artifacts'];
  const colWidths = [10, 15, 80];
  const refactoredBuilds = builds.map(build => ({
    ...build,
    artifacts: build.artifacts?.buildUrl ?? 'not available',
  }));
  const buildTable = printTableJsonArray(headers, refactoredBuilds, colWidths);
  console.log(buildTable);
}

export { makeProjectTarballAsync, printBuildTable };
