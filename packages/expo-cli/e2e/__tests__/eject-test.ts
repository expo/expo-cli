import JsonFile from '@expo/json-file';
import spawnAsync from '@expo/spawn-async';
import fs from 'fs-extra';
import path from 'path';
import temporary from 'tempy';

import { actionAsync } from '../../src/commands/ejectAsync';
import {
  createMinimalProjectAsync,
  EXPO_CLI,
  getBasicExpoConfig,
  getBasicPackageJson,
} from '../TestUtils';

const tempDir = temporary.directory();

function getRoot(...args: string[]) {
  return path.join(tempDir, ...args);
}

function fileExists(projectName: string, filePath: string) {
  return fs.existsSync(path.join(tempDir, projectName, filePath));
}

// 4 minutes -- React Native takes a while to install
const extendedTimeout = 4 * 1000 * 60;

beforeAll(async () => {
  jest.setTimeout(extendedTimeout);
  await fs.mkdirp(tempDir);
});

function executeDefaultAsync(cwd: string, args: string[]) {
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

// Test that the default case works (`expo eject`)
it(`can eject a minimal project`, async () => {
  const projectName = 'default-eject-minimal-world';
  const projectRoot = await createMinimalProjectAsync(tempDir, projectName, {
    name: 'h"&<world/>🚀',
  });

  // Run a standard eject command
  const res = executeDefaultAsync(projectRoot, ['eject']);

  // This shouldn't fail
  await res;

  // Test that native folders were generated
  expect(fileExists(projectName, 'ios/hworld.xcodeproj')).toBe(true);
  expect(fileExists(projectName, 'android')).toBe(true);

  // Test extra generated files were created
  expect(fileExists(projectName, 'metro.config.js')).toBe(true);
  expect(fileExists(projectName, 'index.js')).toBe(true);

  const outputPkgJson = await JsonFile.readAsync(path.join(projectRoot, 'package.json'));

  // Remove main
  expect(outputPkgJson.main).toBe(undefined);
  // Scripts should be rewritten to use react-native-community/cli
  expect(outputPkgJson.scripts['ios']).toBe('expo run:ios');
  expect(outputPkgJson.scripts['android']).toBe('expo run:android');
  expect(outputPkgJson.scripts['web']).toBe('expo start --web');
  // The react-native fork is replaced with the upstream react-native version
  expect(outputPkgJson.dependencies['react-native']).not.toBe(
    getBasicPackageJson().dependencies['react-native']
  );
});

// Test that a reasonable error is thrown when there are no modules installed
it(`warns the user to install modules if the sdkVersion is not defined`, async () => {
  const projectName = 'warn-to-install';
  // Create a minimal project
  const projectRoot = getRoot(projectName);
  // Create the project root aot
  await fs.ensureDir(projectRoot);

  // Create a package.json
  fs.writeFileSync(path.join(projectRoot, 'package.json'), JSON.stringify(getBasicPackageJson()));

  // TODO(Bacon): We shouldn't need this
  fs.writeFileSync(
    path.join(projectRoot, 'app.json'),
    // Erase the sdkVersion
    JSON.stringify({ expo: { ...getBasicExpoConfig(), sdkVersion: undefined } })
  );

  // Run a standard eject command
  await expect(actionAsync(projectRoot, {})).rejects.toThrow(
    /Cannot determine which native SDK version your project uses/
  );
});

// TODO(Bacon): Test more cases after cleaning up the cmd
