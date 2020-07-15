import path from 'path';

import JsonFile from '@expo/json-file';
import temporary from 'tempy';

import { runAsync, tryRunAsync } from '../TestUtils';

test('init --help', async () => {
  const { stdout } = await runAsync(['init', '--help']);
  expect(stdout).toMatch('Usage: init');
});

test('init (no dir name)', async () => {
  const { status, stderr } = await tryRunAsync(['init']);
  expect(status).not.toBe(0);
  expect(stderr).toMatch('The project dir argument is required in non-interactive mode.');
});

xtest('init', async () => {
  jest.setTimeout(60000);
  const cwd = temporary.directory();
  const { stdout } = await runAsync(
    ['init', 'hello-world', '--template', 'blank', '--name', 'Hello'],
    { cwd, env: { ...process.env, YARN_CACHE_FOLDER: path.join(cwd, 'yarn-cache') } }
  );
  expect(stdout).toMatch(`Your project is ready!`);
  const appJson = await JsonFile.readAsync(path.join(cwd, 'hello-world/app.json'));
  expect(appJson).toHaveProperty(['expo', 'name'], 'Hello');
  expect(appJson).toHaveProperty(['expo', 'slug'], 'hello-world');
});
