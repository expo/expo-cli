/* eslint-env jest */
import fs from 'fs-extra';
import os from 'os';
import path from 'path';

import { CocoaPodsPackageManager } from '../CocoaPodsPackageManager';

const projectRoot = getTemporaryPath();

function getTemporaryPath() {
  return path.join(os.tmpdir(), Math.random().toString(36).substring(2));
}
function getRoot(...args) {
  return path.join(projectRoot, ...args);
}

beforeAll(() => {
  jest.mock('@expo/spawn-async', () => {
    return () => {
      if (process.env.TEST_COCOAPODS_MANAGER_SPAWN_VALUE_TO_RETURN) {
        return JSON.parse(process.env.TEST_COCOAPODS_MANAGER_SPAWN_VALUE_TO_RETURN);
      }
      return { stdout: '', stderr: '' };
    };
  });
});

beforeEach(() => {
  delete process.env.TEST_COCOAPODS_MANAGER_SPAWN_VALUE_TO_RETURN;
});

it(`throws for unimplemented methods`, async () => {
  const manager = new CocoaPodsPackageManager({ cwd: projectRoot });

  expect(manager.addAsync()).rejects.toThrow('Unimplemented');
  expect(manager.addDevAsync()).rejects.toThrow('Unimplemented');
  expect(manager.getConfigAsync('')).rejects.toThrow('Unimplemented');
  expect(manager.removeLockfileAsync()).rejects.toThrow('Unimplemented');
  expect(manager.cleanAsync()).rejects.toThrow('Unimplemented');
});

it(`gets the cocoapods version`, async () => {
  const { CocoaPodsPackageManager } = require('../CocoaPodsPackageManager');
  const manager = new CocoaPodsPackageManager({ cwd: projectRoot });
  process.env.TEST_COCOAPODS_MANAGER_SPAWN_VALUE_TO_RETURN = JSON.stringify({ stdout: '1.9.1' });
  expect(await manager.versionAsync()).toBe('1.9.1');
});

it(`can detect if the CLI is installed`, async () => {
  const { CocoaPodsPackageManager } = require('../CocoaPodsPackageManager');
  const manager = new CocoaPodsPackageManager({ cwd: projectRoot });
  process.env.TEST_COCOAPODS_MANAGER_SPAWN_VALUE_TO_RETURN = JSON.stringify({ stdout: '1.9.1' });
  expect(await manager.isCLIInstalledAsync()).toBe(true);
});

it(`can get the directory of a pods project`, async () => {
  const projectRoot = getRoot('cocoapods-detect-pods');
  const iosRoot = path.join(projectRoot, 'ios');
  await fs.ensureDir(iosRoot);

  // first test when no pod project exists
  const { CocoaPodsPackageManager } = require('../CocoaPodsPackageManager');
  expect(CocoaPodsPackageManager.getPodProjectRoot(projectRoot)).toBe(null);

  // next test the ios/ folder
  fs.writeFileSync(path.join(iosRoot, 'Podfile'), '...');

  expect(CocoaPodsPackageManager.getPodProjectRoot(projectRoot)).toBe(iosRoot);

  // finally test that the current directory has higher priority than the ios directory
  fs.writeFileSync(path.join(projectRoot, 'Podfile'), '...');
  expect(CocoaPodsPackageManager.getPodProjectRoot(projectRoot)).toBe(projectRoot);
});

describe('isAvailable', () => {
  let platform: string;
  let originalLog: any;
  beforeAll(() => {
    platform = process.platform;
    originalLog = console.log;
  });
  afterEach(() => {
    Object.defineProperty(process, 'platform', {
      value: platform,
    });
    console.log = originalLog;
  });
  it(`does not support non-darwin machines`, () => {
    // set the platform to something other than darwin
    Object.defineProperty(process, 'platform', {
      value: 'something-random',
    });
    console.log = jest.fn();
    expect(CocoaPodsPackageManager.isAvailable(projectRoot, false)).toBe(false);
    expect(console.log).toBeCalledTimes(1);
  });
  it(`does not support projects without Podfiles`, async () => {
    // ensure the platform is darwin
    Object.defineProperty(process, 'platform', {
      value: 'darwin',
    });
    // create a fake project without a Podfile
    const projectRoot = getRoot('cocoapods-detect-available');
    await fs.ensureDir(projectRoot);

    let message = '';
    console.log = jest.fn(msg => (message = msg));

    expect(CocoaPodsPackageManager.isAvailable(projectRoot, false)).toBe(false);
    expect(console.log).toBeCalledTimes(1);
    expect(message).toMatch(/not supported in this project/);
  });
});
