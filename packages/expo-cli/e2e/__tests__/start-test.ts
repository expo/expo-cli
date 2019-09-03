import path from 'path';

import spawnAsync from '@expo/spawn-async';
import temporary from 'tempy';

import { runAsync, EXPO_CLI } from '../TestUtils';

const projectDir = path.join(temporary.directory(), 'my-app');

beforeAll(async () => {
  jest.setTimeout(60000);
  await runAsync(['init', projectDir, '--template', 'blank', '--name', 'My App']);
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
