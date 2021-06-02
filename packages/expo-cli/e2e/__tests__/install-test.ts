import spawnAsync from '@expo/spawn-async';
import fs from 'fs-extra';
import path from 'path';
import temporary from 'tempy';

import { EXPO_CLI } from '../TestUtils';

const projectRoot = temporary.directory();

function getRoot(...args) {
  return path.join(projectRoot, ...args);
}

// 3 minutes -- React Native takes a while to install
const extendedTimeout = 3 * 1000 * 60;

beforeAll(async () => {
  jest.setTimeout(extendedTimeout);
  await fs.mkdirp(projectRoot);
});

const minimumNativePkgJson = {
  dependencies: {
    expo: '37.0.11',
    react: '16.9.0',
    // speed up test by using the unstable branch
    'react-native': 'https://github.com/expo/react-native/archive/unstable/sdk-37.tar.gz',
  },
  devDependencies: {
    '@babel/core': '7.9.0',
  },
  scripts: {
    start: 'expo start',
    android: 'expo start --android',
    ios: 'expo start --ios',
    web: 'expo web',
    eject: 'expo eject',
  },
  private: true,
};

it(`exits with warning when a package.json is not found in a project`, async () => {
  const projectName = 'empty-folder';
  // Create a minimal project
  const projectRoot = getRoot(projectName);

  // Create the project root aot
  await fs.ensureDir(projectRoot);

  expect.assertions(1);
  try {
    await spawnAsync(EXPO_CLI, ['install'], { cwd: projectRoot });
  } catch (e) {
    expect(e.stderr).toMatch(/No managed or bare projects found/);
  }
});

it(`exits with warning when a package.json is not found in a project with an app.config`, async () => {
  const projectName = 'no-package-json';
  // Create a minimal project
  const projectRoot = getRoot(projectName);

  // Create the project root aot
  await fs.ensureDir(projectRoot);

  fs.writeFileSync(
    path.join(projectRoot, 'app.config.json'),
    JSON.stringify({ sdkVersion: '33.0.0' })
  );

  expect.assertions(1);
  try {
    await spawnAsync(EXPO_CLI, ['install'], { cwd: projectRoot });
  } catch (e) {
    expect(e.stderr).toMatch(/No managed or bare projects found/);
  }
});

it(`works as expected`, async () => {
  const projectName = 'no-package-json';
  // Create a minimal project
  const projectRoot = getRoot(projectName);

  // Create the project root aot
  await fs.ensureDir(projectRoot);

  fs.writeFileSync(
    path.join(projectRoot, 'app.config.json'),
    JSON.stringify({ sdkVersion: '33.0.0' })
  );
  fs.writeFileSync(path.join(projectRoot, 'package.json'), JSON.stringify(minimumNativePkgJson));

  await spawnAsync(EXPO_CLI, ['install', 'expo-camera'], { stdio: 'inherit', cwd: projectRoot });
});
