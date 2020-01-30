import path from 'path';

import spawnAsync from '@expo/spawn-async';
import temporary from 'tempy';

import { EXPO_CLI, runAsync } from '../TestUtils';

const tempDir = temporary.directory();
const projectDir = path.join(tempDir, 'my-app');

beforeAll(async () => {
  jest.setTimeout(60000);
  await runAsync(['init', projectDir, '--template', 'blank', '--name', 'My App'], {
    env: { ...process.env, YARN_CACHE_FOLDER: path.join(tempDir, 'yarn-cache') },
  });
});

test('start --offline', async () => {
  const promise = spawnAsync(EXPO_CLI, ['start', '--offline'], {
    cwd: projectDir,
  });
  const cli = promise.child;
  cli.stdout.pipe(process.stdout).on('data', data => {
    if (/Your native app is running/.test(data.toString())) {
      cli.kill('SIGINT');
    }
  });
  cli.stderr.pipe(process.stderr);
});
