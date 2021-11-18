import spawnAsync from '@expo/spawn-async';
import fs from 'fs-extra';
import path from 'path';
import temporary from 'tempy';

import { EXPO_CLI, getBasicPackageJson } from '../TestUtils';

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
  fs.writeFileSync(path.join(projectRoot, 'package.json'), JSON.stringify(getBasicPackageJson()));

  await spawnAsync(EXPO_CLI, ['install', 'expo-camera'], { stdio: 'inherit', cwd: projectRoot });
});

it(`installs recommended versions of packages`, async () => {
  // Create a minimal project
  const projectRoot = getRoot('install-recommended');
  // Create the project root aot
  await fs.ensureDir(projectRoot);

  fs.writeFileSync(
    path.join(projectRoot, 'app.config.json'),
    JSON.stringify({ sdkVersion: '43.0.0' })
  );
  fs.writeFileSync(path.join(projectRoot, 'package.json'), JSON.stringify(getBasicPackageJson()));

  const { status } = await spawnAsync(
    EXPO_CLI,
    ['install', 'react', 'typescript', '@types/react'],
    { stdio: 'inherit', cwd: projectRoot }
  );

  expect(status).toBe(0);

  const { dependencies } = fs.readJSONSync(path.join(projectRoot, 'package.json'));

  expect(dependencies).toBeDefined();
  expect(Object.keys(dependencies).length).toBe(5);
  expect(dependencies['@types/react']).toBe('~17.0.21');
  expect(dependencies.react).toBe('17.0.1');
  expect(dependencies.typescript).toBe('~4.3.5');
});
