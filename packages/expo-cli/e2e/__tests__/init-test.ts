import JsonFile from '@expo/json-file';
import path from 'path';
import stripAnsi from 'strip-ansi';
import temporary from 'tempy';

import { runAsync, tryRunAsync } from '../TestUtils';

test('init --help', async () => {
  const { stdout } = await runAsync(['init', '--help']);
  expect(stripAnsi(stdout)).toMatch('Usage: init');
});

test('init (no dir name)', async () => {
  const { status, stderr } = await tryRunAsync(['init']);
  expect(status).not.toBe(0);

  expect(stderr).toMatch(/Pass the project name using the first argument/);
});

xtest('init', async () => {
  jest.setTimeout(60000);
  const cwd = temporary.directory();
  const { stdout } = await runAsync(
    ['init', 'hello-world', '--template', 'blank', '--name', 'hello-&<world/>'],
    { cwd, env: { ...process.env, YARN_CACHE_FOLDER: path.join(cwd, 'yarn-cache') } }
  );
  expect(stdout).toMatch(`Your project is ready!`);
  const appJson = await JsonFile.readAsync(path.join(cwd, 'hello-world/app.json'));
  expect(appJson).toHaveProperty(['expo', 'name'], 'hello-&<world/>');
  expect(appJson).toHaveProperty(['expo', 'slug'], 'hello-world');
});
