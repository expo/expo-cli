import JsonFile from '@expo/json-file';
import klawSync from 'klaw-sync';
import path from 'path';
import prettyBytes from 'pretty-bytes';
import temporary from 'tempy';

import { createMinimalProjectAsync, runAsync } from '../TestUtils';

it('exports the project for a self-hosted production deployment', async () => {
  jest.setTimeout(5 * 60e3);
  const projectRoot = await createMinimalProjectAsync(temporary.directory(), 'export-test-app');
  const dotExpoHomeDirectory = path.join(projectRoot, '../.expo');
  await runAsync(
    [
      'export',
      '--public-url',
      'https://example.com/export-test-app/',
      '--dump-assetmap',
      '--max-workers',
      '1',
    ],
    {
      cwd: projectRoot,
      env: {
        ...process.env,
        // Isolate the test from global state such as the currently signed in user.
        __UNSAFE_EXPO_HOME_DIRECTORY: dotExpoHomeDirectory,
      },
    }
  );
  const distPath = path.join(projectRoot, 'dist');

  const assetMap = JsonFile.read(path.join(distPath, 'assetmap.json'));
  expect(deepRelativizePaths(projectRoot, assetMap)).toMatchSnapshot({}, 'assetmap');

  expect(JsonFile.read(path.join(distPath, 'android-index.json'))).toMatchSnapshot(
    {
      commitTime: expect.any(String),
      publishedTime: expect.any(String),
      releaseId: expect.any(String),
      revisionId: expect.any(String),
    },
    'android-index'
  );

  // List output files with sizes for snapshotting.
  // This is to make sure that any changes to the output are intentional.
  // Posix path formatting is used to make paths the same across OSes.
  const distFiles = klawSync(distPath).map(
    entry => `${path.posix.relative(projectRoot, entry.path)} (${formatFileSize(entry)})`
  );
  expect(distFiles).toMatchSnapshot();
});

function formatFileSize(item: klawSync.Item) {
  if (item.stats.isDirectory()) {
    return 'dir';
  } else if (path.basename(item.path) === 'assetmap.json') {
    // ignore the file size of assetmap.json
    return 'size ignored';
  } else {
    return prettyBytes(item.stats.size);
  }
}

function deepRelativizePaths(root: string, data: any) {
  if (typeof data === 'string') {
    return data.startsWith(root) ? path.posix.relative(root, data) : data;
  } else if (Array.isArray(data)) {
    return data.map(item => deepRelativizePaths(root, item));
  } else if (typeof data === 'object') {
    return Object.assign(
      {},
      ...Object.entries(data).map(([key, value]) => ({ [key]: deepRelativizePaths(root, value) }))
    );
  }
}
