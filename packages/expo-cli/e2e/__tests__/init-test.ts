import JsonFile from '@expo/json-file';
import spawnAsync from '@expo/spawn-async';
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

test('init', async () => {
  jest.setTimeout(60000);

  if (process.env.CI) {
    await spawnAsync('git', ['config', '--global', 'user.name', 'Test User']);
  }

  const cwd = temporary.directory();
  const { stdout } = await runAsync(
    ['init', 'hello-world', '--template', 'blank', '--no-install'],
    { cwd, env: { ...process.env, YARN_CACHE_FOLDER: path.join(cwd, 'yarn-cache') } }
  );
  expect(stdout).toMatch(`Your project is ready!`);

  const projectRoot = path.join(cwd, 'hello-world');
  const appJson = await JsonFile.readAsync(path.join(projectRoot, 'app.json'));
  expect(appJson).toHaveProperty(['expo', 'name'], 'hello-world');
  expect(appJson).toHaveProperty(['expo', 'slug'], 'hello-world');

  const { stdout: gitBranch } = await spawnAsync('git', ['status'], {
    cwd: projectRoot,
    stdio: ['pipe', 'pipe', 'inherit'],
  });
  expect(gitBranch).toMatch(/On branch (master|main)\nnothing to commit, working tree clean\n/);
  // expect(gitBranch).toBe('On branch master\nnothing to commit, working tree clean\n');
});

test('init react-native should exit', async () => {
  const cwd = temporary.directory();
  const { stderr } = await tryRunAsync(
    ['init', 'react-native', '--template', 'blank', '--no-install'],
    { cwd, env: { ...process.env, YARN_CACHE_FOLDER: path.join(cwd, 'yarn-cache') } }
  );

  expect(stripAnsi(stderr)).toEqual(
    expect.stringMatching(
      /Cannot create an app named "react-native" because it would conflict with a dependency of the same name/
    )
  );
});

test('init with the deprecated --name argument should exit', async () => {
  const cwd = temporary.directory();
  const { stderr } = await tryRunAsync(['init', 'foobar', '--name', 'foobar-name'], {
    cwd,
    env: { ...process.env, YARN_CACHE_FOLDER: path.join(cwd, 'yarn-cache') },
  });

  expect(stripAnsi(stderr)).toEqual(
    expect.stringMatching(/Deprecated: Use expo init \[name\] instead of --name \[name\]/)
  );
});
