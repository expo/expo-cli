import path from 'path';

import klawSync from 'klaw-sync';
import JsonFile from '@expo/json-file';
import temporary from 'tempy';
import prettyBytes from 'pretty-bytes';

import { createMinimalProjectAsync, runAsync } from '../TestUtils';

it('exports the project for a self-hosted production deployment', async () => {
  jest.setTimeout(4 * 60e3);
  const projectRoot = await createMinimalProjectAsync(temporary.directory(), 'export-test-app');
  await runAsync(
    ['export', '--public-url', 'https://example.com/export-test-app/', '--dump-assetmap'],
    {
      cwd: projectRoot,
    }
  );
  const distPath = path.join(projectRoot, 'dist');
  // List output files with sizes for snapshotting.
  // This is to make sure that any changes to the output are intentional.
  // Posix path formatting is used to make paths the same across OSes.
  const distFiles = klawSync(distPath).map(
    entry =>
      `${path.posix.relative(projectRoot, entry.path)} (${
        entry.stats.isDirectory() ? 'dir' : prettyBytes(entry.stats.size)
      })`
  );
  expect(distFiles).toMatchSnapshot();
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
});

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
