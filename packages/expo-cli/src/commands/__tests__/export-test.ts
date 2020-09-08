import program from 'commander';
import { vol } from 'memfs';

import { mockExpoXDL } from '../../__tests__/mock-utils';
import { jester } from '../../credentials/test-fixtures/mocks-constants';
import {
  assertFolderEmptyAsync,
  collectMergeSourceUrlsAsync,
  ensurePublicUrlAsync,
  getConflictsForDirectory,
  promptPublicUrlAsync,
} from '../export';

jest.mock('fs');
jest.mock('resolve-from');
jest.mock('@expo/image-utils', () => ({
  generateImageAsync(input, { src }) {
    const fs = require('fs');
    return { source: fs.readFileSync(src) };
  },
}));
jest.mock('../utils/Tar', () => ({
  async downloadAndDecompressAsync(url: string, destination: string): Promise<string> {
    return destination;
  },
}));

mockExpoXDL({
  UserManager: {
    ensureLoggedInAsync: jest.fn(() => jester),
    getCurrentUserAsync: jest.fn(() => jester),
  },
  ApiV2: {
    clientForUser: jest.fn(),
  },
});

function getDirFromFS(fsJSON: Record<string, string | null>, rootDir: string) {
  return Object.entries(fsJSON)
    .filter(([path, value]) => value !== null && path.startsWith(rootDir))
    .reduce<Record<string, string>>(
      (acc, [path, fileContent]) => ({
        ...acc,
        [path.substring(rootDir.length).startsWith('/')
          ? path.substring(rootDir.length + 1)
          : path.substring(rootDir.length)]: fileContent,
      }),
      {}
    );
}

it(`throws a coded error when prompted in non interactive`, async () => {
  program.nonInteractive = true;
  await expect(promptPublicUrlAsync()).rejects.toThrow('public-url');
});

describe('ensurePublicUrlAsync', () => {
  const originalWarn = console.warn;
  const originalLog = console.log;
  beforeEach(() => {
    console.warn = jest.fn();
    console.log = jest.fn();
  });
  afterAll(() => {
    console.warn = originalWarn;
    console.log = originalLog;
  });

  it(`throws when a URL is not HTTPS in prod`, async () => {
    await expect(ensurePublicUrlAsync('bacon', false)).rejects.toThrow('must be a valid HTTPS URL');
    await expect(ensurePublicUrlAsync('ssh://bacon.io', false)).rejects.toThrow(
      'must be a valid HTTPS URL'
    );
  });
  it(`does not throw when an invalid URL is used in dev mode`, async () => {
    await expect(ensurePublicUrlAsync('bacon', true)).resolves.toBe('bacon');
    await expect(ensurePublicUrlAsync('ssh://bacon.io', true)).resolves.toBe('ssh://bacon.io');
    // Ensure we warn about the invalid URL in dev mode.
    expect(console.warn).toBeCalledTimes(2);
  });

  it(`validates a URL`, async () => {
    await expect(ensurePublicUrlAsync('https://expo.io', true)).resolves.toBe('https://expo.io');
    // No warnings thrown
    expect(console.warn).toBeCalledTimes(0);
  });
});

describe('collectMergeSourceUrlsAsync', () => {
  const projectRoot = '/alpha';

  beforeAll(() => {
    vol.fromJSON({});
  });

  afterAll(() => {
    vol.reset();
  });

  it(`downloads tar files`, async () => {
    const directories = await collectMergeSourceUrlsAsync(projectRoot, ['expo.io/app.tar.gz']);
    expect(directories.length).toBe(1);
    // Ensure the file was downloaded with the expected name
    expect(directories[0]).toMatch(/\/alpha\/\.tmp\/app_/);

    // Ensure the tmp directory was created and the file was added
    expect(vol.existsSync(directories[0])).toBe(true);
  });
});

describe('getConflictsForDirectory', () => {
  const projectRoot = '/alpha';

  beforeAll(() => {
    vol.fromJSON({
      [projectRoot + '/LICENSE']: 'noop',
      [projectRoot + '/app.js']: 'noop',
    });
  });

  afterAll(() => {
    vol.reset();
  });

  it(`skips tolerable files`, async () => {
    expect(getConflictsForDirectory(projectRoot, ['LICENSE'])).toStrictEqual(['app.js']);
    expect(getConflictsForDirectory(projectRoot, [])).toStrictEqual(['LICENSE', 'app.js']);
  });
});

describe('assertFolderEmptyAsync', () => {
  const projectRoot = '/alpha';
  const projectRootEmpty = '/beta';

  beforeEach(() => {
    vol.fromJSON({
      [projectRoot + '/LICENSE']: 'noop',
      [projectRoot + '/bundles/app.js']: 'noop',
      [projectRootEmpty + '/LICENSE']: 'noop',
    });
  });

  afterEach(() => {
    vol.reset();
  });

  const originalWarn = console.warn;
  const originalLog = console.log;
  beforeEach(() => {
    console.warn = jest.fn();
    console.log = jest.fn();
  });
  afterAll(() => {
    console.warn = originalWarn;
    console.log = originalLog;
  });

  it(`returns false when conflicts are found and they cannot be removed`, async () => {
    // Should return false indicating that the CLI must exit.
    expect(await assertFolderEmptyAsync({ projectRoot: '/alpha', overwrite: false })).toBe(false);
    const after = getDirFromFS(vol.toJSON(), projectRoot);
    // Ensure that no files were deleted.
    expect(after).toStrictEqual({ LICENSE: 'noop', 'bundles/app.js': 'noop' });
  });

  it(`returns true when no conflicts are found`, async () => {
    expect(await assertFolderEmptyAsync({ projectRoot: projectRootEmpty, overwrite: false })).toBe(
      true
    );
    const after = getDirFromFS(vol.toJSON(), projectRootEmpty);
    // Ensure that no files were deleted.
    expect(after).toStrictEqual({ LICENSE: 'noop' });
  });

  it(`returns true when conflicts are found and deleted`, async () => {
    expect(await assertFolderEmptyAsync({ projectRoot: '/alpha', overwrite: true })).toBe(true);
    const after = getDirFromFS(vol.toJSON(), projectRoot);
    // Ensure that the tolerable files were not deleted, and the others were
    expect(after).toStrictEqual({ LICENSE: 'noop' });
  });
});
