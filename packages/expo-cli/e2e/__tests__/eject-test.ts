import JsonFile from '@expo/json-file';
import spawnAsync from '@expo/spawn-async';
import fs from 'fs-extra';
import path from 'path';
import temporary from 'tempy';

import { EXPO_CLI } from '../TestUtils';

const projectRoot = temporary.directory();

function getRoot(...args) {
  return path.join(projectRoot, ...args);
}

function fileExists(projectName, filePath) {
  return fs.existsSync(path.join(projectRoot, projectName, filePath));
}

// 3 minutes -- React Native takes a while to install
const extendedTimeout = 3 * 1000 * 60;

beforeAll(async () => {
  jest.setTimeout(extendedTimeout);
  await fs.mkdirp(projectRoot);
});

afterAll(async () => {
  await fs.remove(projectRoot);
});

function executeDefaultAsync(cwd, args) {
  const promise = spawnAsync(EXPO_CLI, args, { cwd });
  promise.child.stdout.pipe(process.stdout);
  promise.child.stderr.pipe(process.stderr);

  // When the test is prompted to use git, skip message
  // TODO(Bacon): this shouldn't be blocking in non-interactive
  promise.child.stdout.on('data', data => {
    const stdout = data.toString();
    // Skip dirty git
    if (/Would you like to proceed/.test(stdout)) {
      promise.child.stdin.write('\n');
    }
  });

  return promise;
}

// TODO(Bacon): This is too much stuff
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

const expoMinConfig = {
  expo: {
    sdkVersion: '37.0.0',
    android: { package: 'com.test.minimal' },
    ios: { bundleIdentifier: 'com.test.minimal' },
  },
};

it(`can eject a minimal project`, async () => {
  const projectName = 'default-eject-minimal';
  // Create a minimal project
  const projectRoot = getRoot(projectName);

  // Create the project root aot
  await fs.ensureDir(projectRoot);

  // Create a package.json
  fs.writeFileSync(path.join(projectRoot, 'package.json'), JSON.stringify(minimumNativePkgJson));

  // TODO(Bacon): We shouldn't need this
  fs.writeFileSync(path.join(projectRoot, 'app.json'), JSON.stringify(expoMinConfig));

  // TODO(Bacon): We shouldn't need this
  // Install the packages so eject can infer the versions
  await spawnAsync('yarn', [], { cwd: projectRoot });

  // Run a standard eject command
  const res = executeDefaultAsync(projectRoot, ['eject']);

  // This shouldn't fail
  await res;

  // Test that native folders were generated
  // TODO(Bacon): test that the native file names match
  expect(await fileExists(projectName, 'ios')).toBe(true);
  expect(await fileExists(projectName, 'android')).toBe(true);

  // Test extra generated files were created
  expect(await fileExists(projectName, 'metro.config.js')).toBe(true);
  expect(await fileExists(projectName, 'index.js')).toBe(true);

  const outputPkgJson = await JsonFile.readAsync(path.join(projectRoot, 'package.json'));

  // Test that the scripts were rewritten
  expect(outputPkgJson.scripts['ios']).toBe('react-native run-ios');
  expect(outputPkgJson.scripts['android']).toBe('react-native run-android');
  expect(outputPkgJson.scripts['web']).toBe('expo web');
});

// TODO(Bacon): Test more cases after cleaning up the cmd
