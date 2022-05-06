/* eslint-env jest */
import spawnAsync from '@expo/spawn-async';
import { vol } from 'memfs';
import path from 'path';
import { PassThrough } from 'stream';

import { YarnPackageManager, YarnStderrTransform } from '../YarnPackageManager';
import isYarnOfflineAsync from '../utils/isYarnOfflineAsync';

jest.mock('../utils/isYarnOfflineAsync');
jest.mock('fs');
jest.mock('@expo/spawn-async', () => {
  const actualModule = jest.requireActual('@expo/spawn-async');

  return {
    __esModule: true,
    ...actualModule,
    // minimal implementation is needed here because the packager manager depends on the child property to exist.
    default: jest.fn((_command, _args, _options) => {
      const promise = new Promise((resolve, _reject) => resolve({}));
      // @ts-ignore: TypeScript isn't aware the Promise constructor argument runs synchronously
      promise.child = {};
      return promise;
    }),
  };
});

const mockedSpawnAsync = spawnAsync as jest.MockedFunction<typeof spawnAsync>;
const mockedIsYarnOfflineAsync = isYarnOfflineAsync as jest.MockedFunction<
  typeof isYarnOfflineAsync
>;

describe('YarnPackageManager', () => {
  // Default options for all instances, logger is disabled to prevent spamming jest results
  const cwd = '/project/with-yarn';
  const log = jest.fn();

  afterEach(() => {
    mockedIsYarnOfflineAsync.mockReset();
  });

  describe('installAsync', () => {
    it('runs normal installation', async () => {
      const yarn = new YarnPackageManager({ log, cwd });
      await yarn.installAsync();

      expect(spawnAsync).toBeCalledWith('yarnpkg', ['install'], expect.objectContaining({ cwd }));
    });

    describe('offline', () => {
      beforeEach(() => {
        mockedIsYarnOfflineAsync.mockResolvedValue(true);
      });

      it('runs installation when offline', async () => {
        const yarn = new YarnPackageManager({ log, cwd });
        await yarn.installAsync();

        expect(spawnAsync).toBeCalledWith(
          'yarnpkg',
          ['install', '--offline'],
          expect.objectContaining({ cwd })
        );
      });
    });
  });

  describe('addWithParametersAsync', () => {
    it('adds a single package with custom parameters', async () => {
      const yarn = new YarnPackageManager({ log, cwd });
      await yarn.addWithParametersAsync(['@babel/core'], ['--cache-folder=/tmp']);

      expect(spawnAsync).toBeCalledWith(
        'yarnpkg',
        ['add', '@babel/core', '--cache-folder=/tmp'],
        expect.objectContaining({ cwd })
      );
    });

    it('adds multiple packages with custom parameters', async () => {
      const pnpm = new YarnPackageManager({ log, cwd });
      await pnpm.addWithParametersAsync(['@babel/core', '@babel/runtime'], ['--cache-folder=/tmp']);

      expect(spawnAsync).toBeCalledWith(
        'yarnpkg',
        ['add', '@babel/core', '@babel/runtime', '--cache-folder=/tmp'],
        expect.objectContaining({ cwd })
      );
    });

    it('installs project without packages', async () => {
      const pnpm = new YarnPackageManager({ log, cwd });
      await pnpm.addWithParametersAsync([], ['--cache-folder=/tmp']);

      expect(spawnAsync).toBeCalledWith('yarnpkg', ['install'], expect.objectContaining({ cwd }));
    });

    describe('offline', () => {
      beforeEach(() => {
        mockedIsYarnOfflineAsync.mockResolvedValue(true);
      });

      it('adds a single package with custom parameters when offline', async () => {
        const yarn = new YarnPackageManager({ log, cwd });
        await yarn.addWithParametersAsync(['@babel/core'], ['--cache-folder=/tmp']);

        expect(spawnAsync).toBeCalledWith(
          'yarnpkg',
          ['add', '--offline', '@babel/core', '--cache-folder=/tmp'],
          expect.objectContaining({ cwd })
        );
      });

      it('adds multiple packages with custom parameters when offline', async () => {
        const pnpm = new YarnPackageManager({ log, cwd });
        await pnpm.addWithParametersAsync(
          ['@babel/core', '@babel/runtime'],
          ['--cache-folder=/tmp']
        );

        expect(spawnAsync).toBeCalledWith(
          'yarnpkg',
          ['add', '--offline', '@babel/core', '@babel/runtime', '--cache-folder=/tmp'],
          expect.objectContaining({ cwd })
        );
      });

      it('installs project without packages', async () => {
        const pnpm = new YarnPackageManager({ log, cwd });
        await pnpm.addWithParametersAsync([], ['--cache-folder=/tmp']);

        expect(spawnAsync).toBeCalledWith(
          'yarnpkg',
          ['install', '--offline'],
          expect.objectContaining({ cwd })
        );
      });
    });
  });

  describe('addAsync', () => {
    it('adds a single package to dependencies', async () => {
      const yarn = new YarnPackageManager({ log, cwd });
      await yarn.addAsync('@react-navigation/native');

      expect(spawnAsync).toBeCalledWith(
        'yarnpkg',
        ['add', '@react-navigation/native'],
        expect.objectContaining({ cwd })
      );
    });

    it('adds multiple packages to dependencies', async () => {
      const yarn = new YarnPackageManager({ log, cwd });
      await yarn.addAsync('@react-navigation/native', '@react-navigation/drawer');

      expect(spawnAsync).toBeCalledWith(
        'yarnpkg',
        ['add', '@react-navigation/native', '@react-navigation/drawer'],
        expect.objectContaining({ cwd })
      );
    });

    it('installs project without packages', async () => {
      const yarn = new YarnPackageManager({ log, cwd });
      await yarn.addAsync();

      expect(spawnAsync).toBeCalledWith('yarnpkg', ['install'], expect.objectContaining({ cwd }));
    });

    describe('offline', () => {
      beforeEach(() => {
        mockedIsYarnOfflineAsync.mockResolvedValue(true);
      });

      it('adds a single package to dependencies when offline', async () => {
        const yarn = new YarnPackageManager({ log, cwd });
        await yarn.addAsync('@react-navigation/native');

        expect(spawnAsync).toBeCalledWith(
          'yarnpkg',
          ['add', '--offline', '@react-navigation/native'],
          expect.objectContaining({ cwd })
        );
      });

      it('adds multiple packages to dependencies when offline', async () => {
        const yarn = new YarnPackageManager({ log, cwd });
        await yarn.addAsync('@react-navigation/native', '@react-navigation/drawer');

        expect(spawnAsync).toBeCalledWith(
          'yarnpkg',
          ['add', '--offline', '@react-navigation/native', '@react-navigation/drawer'],
          expect.objectContaining({ cwd })
        );
      });

      it('installs project without packages when offline', async () => {
        const yarn = new YarnPackageManager({ log, cwd });
        await yarn.addAsync();

        expect(spawnAsync).toBeCalledWith(
          'yarnpkg',
          ['install', '--offline'],
          expect.objectContaining({ cwd })
        );
      });
    });
  });

  describe('addDevAsync', () => {
    it('adds a single package to dev dependencies', async () => {
      const yarn = new YarnPackageManager({ log, cwd });
      await yarn.addDevAsync('eslint');

      expect(spawnAsync).toBeCalledWith(
        'yarnpkg',
        ['add', '--dev', 'eslint'],
        expect.objectContaining({ cwd })
      );
    });

    it('adds multiple packages to dev dependencies', async () => {
      const yarn = new YarnPackageManager({ log, cwd });
      await yarn.addDevAsync('eslint', 'prettier');

      expect(spawnAsync).toBeCalledWith(
        'yarnpkg',
        ['add', '--dev', 'eslint', 'prettier'],
        expect.objectContaining({ cwd })
      );
    });

    it('installs project without packages', async () => {
      const yarn = new YarnPackageManager({ log, cwd });
      await yarn.addDevAsync();

      expect(spawnAsync).toBeCalledWith('yarnpkg', ['install'], expect.objectContaining({ cwd }));
    });

    describe('offline', () => {
      beforeEach(() => {
        mockedIsYarnOfflineAsync.mockResolvedValue(true);
      });

      it('adds a single package to dev dependencies when offline', async () => {
        const yarn = new YarnPackageManager({ log, cwd });
        await yarn.addDevAsync('eslint');

        expect(spawnAsync).toBeCalledWith(
          'yarnpkg',
          ['add', '--dev', '--offline', 'eslint'],
          expect.objectContaining({ cwd })
        );
      });

      it('adds multiple packages to dev dependencies when offline', async () => {
        const yarn = new YarnPackageManager({ log, cwd });
        await yarn.addDevAsync('eslint', 'prettier');

        expect(spawnAsync).toBeCalledWith(
          'yarnpkg',
          ['add', '--dev', '--offline', 'eslint', 'prettier'],
          expect.objectContaining({ cwd })
        );
      });

      it('installs project without packages when offline', async () => {
        const yarn = new YarnPackageManager({ log, cwd });
        await yarn.addDevAsync();

        expect(spawnAsync).toBeCalledWith(
          'yarnpkg',
          ['install', '--offline'],
          expect.objectContaining({ cwd })
        );
      });
    });
  });

  describe('addGlobalAsync', () => {
    it('adds a single package globally', async () => {
      const yarn = new YarnPackageManager({ log, cwd });
      await yarn.addGlobalAsync('expo-cli@^5');

      expect(spawnAsync).toBeCalledWith(
        'yarnpkg',
        ['global', 'add', 'expo-cli@^5'],
        expect.anything()
      );
    });

    it('adds multiple packages globally', async () => {
      const yarn = new YarnPackageManager({ log, cwd });
      await yarn.addGlobalAsync('expo-cli@^5', 'eas-cli');

      expect(spawnAsync).toBeCalledWith(
        'yarnpkg',
        ['global', 'add', 'expo-cli@^5', 'eas-cli'],
        expect.anything()
      );
    });

    describe('offline', () => {
      beforeEach(() => {
        mockedIsYarnOfflineAsync.mockResolvedValue(true);
      });

      it('adds a single package globally', async () => {
        const yarn = new YarnPackageManager({ log, cwd });
        await yarn.addGlobalAsync('expo-cli@^5');

        expect(spawnAsync).toBeCalledWith(
          'yarnpkg',
          ['global', 'add', '--offline', 'expo-cli@^5'],
          expect.anything()
        );
      });

      it('adds multiple packages globally', async () => {
        const yarn = new YarnPackageManager({ log, cwd });
        await yarn.addGlobalAsync('expo-cli@^5', 'eas-cli');

        expect(spawnAsync).toBeCalledWith(
          'yarnpkg',
          ['global', 'add', '--offline', 'expo-cli@^5', 'eas-cli'],
          expect.anything()
        );
      });
    });
  });

  describe('removeAsync', () => {
    it('removes a single package', async () => {
      const yarn = new YarnPackageManager({ log, cwd });
      await yarn.removeAsync('metro');

      expect(spawnAsync).toBeCalledWith(
        'yarnpkg',
        ['remove', 'metro'],
        expect.objectContaining({ cwd })
      );
    });

    it('removes multiple packages', async () => {
      const yarn = new YarnPackageManager({ log, cwd });
      await yarn.removeAsync('metro', 'jest-haste-map');

      expect(spawnAsync).toBeCalledWith(
        'yarnpkg',
        ['remove', 'metro', 'jest-haste-map'],
        expect.objectContaining({ cwd })
      );
    });
  });

  describe('versionAsync', () => {
    it('returns version from yarn', async () => {
      mockedSpawnAsync.mockResolvedValue({ stdout: '1.22.15\n' } as any);

      const yarn = new YarnPackageManager({ log, cwd });

      expect(await yarn.versionAsync()).toBe('1.22.15');
      expect(spawnAsync).toBeCalledWith('yarnpkg', ['--version'], expect.anything());
    });
  });

  describe('getConfigAsync', () => {
    it('returns a configuration key from yarn', async () => {
      mockedSpawnAsync.mockResolvedValue({ stdout: 'https://registry.yarnpkg.com\n' } as any);

      const yarn = new YarnPackageManager({ log, cwd });

      expect(await yarn.getConfigAsync('registry')).toBe('https://registry.yarnpkg.com');
      expect(spawnAsync).toBeCalledWith(
        'yarnpkg',
        ['config', 'get', 'registry'],
        expect.anything()
      );
    });
  });

  describe('removeLockfileAsync', () => {
    afterEach(() => vol.reset());

    it('removes yarn.lock file relative to cwd', async () => {
      vol.fromJSON({
        [path.join(cwd, 'package.json')]: '{}',
        [path.join(cwd, 'yarn.lock')]: '',
      });

      const yarn = new YarnPackageManager({ log, cwd });
      await yarn.removeLockfileAsync();

      expect(vol.existsSync(path.join(cwd, 'yarn.lock'))).toBe(false);
    });

    it('skips removing non-existing yarn.lock', async () => {
      vol.fromJSON({
        [path.join(cwd, 'package.json')]: '{}',
      });

      const yarn = new YarnPackageManager({ log, cwd });
      await yarn.removeLockfileAsync();

      expect(vol.existsSync(path.join(cwd, 'yarn.lock'))).toBe(false);
    });

    it('fails when no cwd is provided', async () => {
      const yarn = new YarnPackageManager({ log, cwd: undefined });
      await expect(yarn.removeLockfileAsync()).rejects.toThrow('cwd required');
    });
  });

  describe('cleanAsync', () => {
    afterEach(() => vol.reset());

    it('removes node_modules folder relative to cwd', async () => {
      vol.fromJSON({
        [path.join(cwd, 'package.json')]: '{}',
        [path.join(cwd, 'node_modules/expo/package.json')]: '{}',
      });

      const yarn = new YarnPackageManager({ log, cwd });
      await yarn.cleanAsync();

      expect(vol.existsSync(path.join(cwd, 'node_modules'))).toBe(false);
    });

    it('skips removing non-existing node_modules folder', async () => {
      vol.fromJSON({
        [path.join(cwd, 'package.json')]: '{}',
      });

      const yarn = new YarnPackageManager({ log, cwd });
      await yarn.cleanAsync();

      expect(vol.existsSync(path.join(cwd, 'node_modules'))).toBe(false);
    });

    it('fails when no cwd is provided', async () => {
      const yarn = new YarnPackageManager({ log, cwd: undefined });
      await expect(yarn.cleanAsync()).rejects.toThrow('cwd required');
    });
  });
});

describe('YarnStderrTransform', () => {
  const installNormal = `
yarn install v1.22.15
[1/4] Resolving packages...
success Already up-to-date.
Done in 0.06s.
  `;

  const installPeerDepsWarning = `
warning "react-native > react-native-codegen > jscodeshift@0.13.1" has unmet peer dependency "@babel/preset-env@^7.1.6".
  `;

  it('does not filter normal output', () => {
    const stream = new PassThrough().pipe(new YarnStderrTransform()).on('data', (data: Buffer) => {
      expect(installNormal).toContain(data.toString());
    });

    stream.write(installNormal);
    stream.end();

    return new Promise<void>((resolve, reject) => {
      stream.on('error', reject);
      stream.on('end', resolve);
    });
  });

  it('filters peer dependency warnings', () => {
    const stream = new PassThrough().pipe(new YarnStderrTransform()).on('data', (data: Buffer) => {
      expect(data.toString()).not.toContain('peer dependency');
    });

    stream.write(installNormal);
    stream.write(installPeerDepsWarning);
    stream.end();

    return new Promise<void>((resolve, reject) => {
      stream.on('error', reject);
      stream.on('end', resolve);
    });
  });
});
