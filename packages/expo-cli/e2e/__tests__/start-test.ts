import path from 'path';

import spawnAsync from '@expo/spawn-async';
import { ProjectSettings } from '@expo/xdl';
import temporary from 'tempy';

import { EXPO_CLI, runAsync } from '../TestUtils';

const tempDir = temporary.directory();
const projectDir = path.join(tempDir, 'my-app');

beforeAll(async () => {
  // jest.setTimeout(60000);
  // await runAsync(['init', projectDir, '--template', 'blank', '--name', 'My App'], {
  //   env: { ...process.env, YARN_CACHE_FOLDER: path.join(tempDir, 'yarn-cache') },
  // });
});

xtest('start --offline', async () => {
  const promise = spawnAsync(EXPO_CLI, ['start', '--offline'], { cwd: projectDir });
  const cli = promise.child;

  cli.stderr.pipe(process.stderr);
  cli.stdout
    .on('data', data => {
      if (/Your native app is running/.test(data.toString())) {
        cli.kill('SIGINT');
      }
    })
    .pipe(process.stdout);

  await promise;
});

xtest('start --offline with existing packager info', async () => {
  await ProjectSettings.setPackagerInfoAsync(tempDir, {
    devToolsPort: 19002,
    expoServerPort: 19001,
    packagerPort: 19000,
    packagerPid: 1337,
  });

  const promise = spawnAsync(EXPO_CLI, ['start', '--offline'], { cwd: projectDir });
  const cli = promise.child;

  cli.stderr.pipe(process.stderr);
  cli.stdout
    .on('data', data => {
      if (/Your native app is running/.test(data.toString())) {
        cli.kill('SIGINT');
      }
    })
    .pipe(process.stdout);

  try {
    await promise;
  } finally {
    await ProjectSettings.setPackagerInfoAsync(tempDir, {
      devToolsPort: null,
      expoServerPort: null,
      packagerPort: null,
      packagerPid: null,
    });
  }
});
