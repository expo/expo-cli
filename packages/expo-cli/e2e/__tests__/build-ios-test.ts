import spawnAsync from '@expo/spawn-async';
import fs from 'fs-extra';
import path from 'path';
import temporary from 'tempy';

import { EXPO_CLI, generateFakeReactNativeAsync } from '../TestUtils';

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
  sdkVersion: '37.0.0',
  // android: { package: 'com.test.minimal' },
  // ios: { bundleIdentifier: 'com.test.minimal' },
};

describe('validation', () => {
  // Test that the default case works (`expo eject`)
  it(`fails when no bundle identifier is defined in non-interactive mode`, async () => {
    const projectName = 'build-ios-no-bundle-id-non-interactive';
    // Create a minimal project
    const projectRoot = getRoot(projectName);

    // Create the project root aot
    await fs.ensureDir(projectRoot);

    // Create a package.json
    fs.writeFileSync(path.join(projectRoot, 'package.json'), JSON.stringify(minimumNativePkgJson));
    fs.writeFileSync(path.join(projectRoot, 'app.config.json'), JSON.stringify(expoMinConfig));
    await generateFakeReactNativeAsync(projectRoot);
    expect.assertions(1);

    try {
      // Run the command
      await executeDefaultAsync(projectRoot, ['build:ios', '--non-interactive']);
    } catch (e) {
      expect(e.stderr).toMatch(
        /Your project must have a \`bundleIdentifier\` set in the Expo config/
      );
    }
  });
});
