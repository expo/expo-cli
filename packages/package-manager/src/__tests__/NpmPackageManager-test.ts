/* eslint-env jest */
import spawnAsync from '@expo/spawn-async';
import { vol } from 'memfs';
import path from 'path';
import split from 'split';
import { PassThrough } from 'stream';

import { NpmPackageManager, NpmStderrTransform } from '../NpmPackageManager';

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

describe('NpmPackageManager', () => {
  // Default options for all instances, logger is disabled to prevent spamming jest results
  const cwd = '/project/with-npm';
  const log = jest.fn();

  afterEach(() => {
    vol.reset();
    mockedSpawnAsync.mockClear();
  });

  it('uses different spawners', async () => {
    const spawner = jest.fn(mockedSpawnAsync);
    const npm = new NpmPackageManager({ cwd, log, spawner });
    await npm.installAsync();

    expect(spawner).toBeCalledWith('npm', ['install'], expect.objectContaining({ cwd }));
  });

  describe('installAsync', () => {
    it('runs normal installation', async () => {
      const npm = new NpmPackageManager({ log, cwd });
      await npm.installAsync();

      expect(spawnAsync).toBeCalledWith('npm', ['install'], expect.objectContaining({ cwd }));
    });

    // Note, passing parameters to install is only for npm itself.
    it('runs install with paramenters', async () => {
      const npm = new NpmPackageManager({ log, cwd });
      await npm.installAsync(['--save-optional']);

      expect(spawnAsync).toBeCalledWith(
        'npm',
        ['install', '--save-optional'],
        expect.objectContaining({ cwd })
      );
    });
  });

  describe('addWithParametersAsync', () => {
    it('adds a single package with custom parameters', async () => {
      const npm = new NpmPackageManager({ log, cwd });
      await npm.addWithParametersAsync(['@babel/core'], ['--save-exact']);

      expect(spawnAsync).toBeCalledWith(
        'npm',
        ['install', '--save', '@babel/core', '--save-exact'],
        expect.objectContaining({ cwd })
      );
    });

    it('adds multiple packages with custom parameters', async () => {
      const npm = new NpmPackageManager({ log, cwd });
      await npm.addWithParametersAsync(['@babel/core', '@babel/runtime'], ['--save-exact']);

      expect(spawnAsync).toBeCalledWith(
        'npm',
        ['install', '--save', '@babel/core', '@babel/runtime', '--save-exact'],
        expect.objectContaining({ cwd })
      );
    });

    it('installs project without packages', async () => {
      const npm = new NpmPackageManager({ log, cwd });
      await npm.addWithParametersAsync([], ['--save-optional']);

      expect(spawnAsync).toBeCalledWith(
        'npm',
        ['install', '--save-optional'],
        expect.objectContaining({ cwd })
      );
    });

    it('adds single package with exact version', async () => {
      vol.fromJSON({
        [path.join(cwd, 'package.json')]: JSON.stringify({
          name: 'expo-app',
          version: '1.0.0',
          dependencies: {
            expo: '^45.0.0',
          },
        }),
      });

      const npm = new NpmPackageManager({ log, cwd });
      await npm.addWithParametersAsync(['@babel/core@7.17.10'], ['--save-exact']);

      const { dependencies } = JSON.parse(
        vol.readFileSync(path.join(cwd, 'package.json'), 'utf8').toString()
      );

      expect(dependencies).toHaveProperty('@babel/core', '7.17.10');
      expect(spawnAsync).toBeCalledWith(
        'npm',
        ['install', '--save-exact'],
        expect.objectContaining({ cwd })
      );
    });

    it('adds multiple packages with exact versions', async () => {
      vol.fromJSON({
        [path.join(cwd, 'package.json')]: JSON.stringify({
          name: 'expo-app',
          version: '1.0.0',
          dependencies: {
            expo: '^45.0.0',
          },
        }),
      });

      const npm = new NpmPackageManager({ log, cwd });
      await npm.addWithParametersAsync(
        ['@babel/core@7.17.10', '@babel/runtime@7.17.9'],
        ['--save-exact']
      );

      const { dependencies } = JSON.parse(
        vol.readFileSync(path.join(cwd, 'package.json'), 'utf8').toString()
      );

      expect(dependencies).toHaveProperty('@babel/core', '7.17.10');
      expect(dependencies).toHaveProperty('@babel/runtime', '7.17.9');
      expect(spawnAsync).toBeCalledWith(
        'npm',
        ['install', '--save-exact'],
        expect.objectContaining({ cwd })
      );
    });
  });

  describe('addAsync', () => {
    it('adds a single package to dependencies', async () => {
      const npm = new NpmPackageManager({ log, cwd });
      await npm.addAsync('@react-navigation/native');

      expect(spawnAsync).toBeCalledWith(
        'npm',
        ['install', '--save', '@react-navigation/native'],
        expect.objectContaining({ cwd })
      );
    });

    it('adds multiple packages to dependencies', async () => {
      const npm = new NpmPackageManager({ log, cwd });
      await npm.addAsync('@react-navigation/native', '@react-navigation/drawer');

      expect(spawnAsync).toBeCalledWith(
        'npm',
        ['install', '--save', '@react-navigation/native', '@react-navigation/drawer'],
        expect.objectContaining({ cwd })
      );
    });

    it('installs project without packages', async () => {
      const npm = new NpmPackageManager({ log, cwd });
      await npm.addAsync();

      expect(spawnAsync).toBeCalledWith('npm', ['install'], expect.objectContaining({ cwd }));
    });

    it('adds a single package with exact version', async () => {
      vol.fromJSON({
        [path.join(cwd, 'package.json')]: JSON.stringify({
          name: 'expo-app',
          version: '1.0.0',
          dependencies: {
            expo: '^45.0.0',
          },
        }),
      });

      const npm = new NpmPackageManager({ log, cwd });
      await npm.addAsync('@react-navigation/native@^6.0.10');

      const { dependencies } = JSON.parse(
        vol.readFileSync(path.join(cwd, 'package.json'), 'utf8').toString()
      );

      expect(dependencies).toHaveProperty('@react-navigation/native', '^6.0.10');
      expect(spawnAsync).toBeCalledWith('npm', ['install'], expect.objectContaining({ cwd }));
    });

    it('adds multiple packages with exact versions', async () => {
      vol.fromJSON({
        [path.join(cwd, 'package.json')]: JSON.stringify({
          name: 'expo-app',
          version: '1.0.0',
          dependencies: {
            expo: '^45.0.0',
          },
        }),
      });

      const npm = new NpmPackageManager({ log, cwd });
      await npm.addAsync('@react-navigation/native@^6.0.10', '@react-navigation/drawer@^6.4.1');

      const { dependencies } = JSON.parse(
        vol.readFileSync(path.join(cwd, 'package.json'), 'utf8').toString()
      );

      expect(dependencies).toHaveProperty('@react-navigation/native', '^6.0.10');
      expect(dependencies).toHaveProperty('@react-navigation/drawer', '^6.4.1');
      expect(spawnAsync).toBeCalledWith('npm', ['install'], expect.objectContaining({ cwd }));
    });
  });

  describe('addDevAsync', () => {
    it('adds a single package to dev dependencies', async () => {
      const npm = new NpmPackageManager({ log, cwd });
      await npm.addDevAsync('eslint');

      expect(spawnAsync).toBeCalledWith(
        'npm',
        ['install', '--save-dev', 'eslint'],
        expect.objectContaining({ cwd })
      );
    });

    it('adds multiple packages to dev dependencies', async () => {
      const npm = new NpmPackageManager({ log, cwd });
      await npm.addDevAsync('eslint', 'prettier');

      expect(spawnAsync).toBeCalledWith(
        'npm',
        ['install', '--save-dev', 'eslint', 'prettier'],
        expect.objectContaining({ cwd })
      );
    });

    it('installs project without packages', async () => {
      const npm = new NpmPackageManager({ log, cwd });
      await npm.addDevAsync();

      expect(spawnAsync).toBeCalledWith('npm', ['install'], expect.objectContaining({ cwd }));
    });

    it('adds a single package with exact version', async () => {
      vol.fromJSON({
        [path.join(cwd, 'package.json')]: JSON.stringify({
          name: 'expo-app',
          version: '1.0.0',
          dependencies: {
            expo: '^45.0.0',
          },
          devDependencies: {},
        }),
      });

      const npm = new NpmPackageManager({ log, cwd });
      await npm.addDevAsync('eslint@^8.0.0');

      const { devDependencies } = JSON.parse(
        vol.readFileSync(path.join(cwd, 'package.json'), 'utf8').toString()
      );

      expect(devDependencies).toHaveProperty('eslint', '^8.0.0');
      expect(spawnAsync).toBeCalledWith('npm', ['install'], expect.objectContaining({ cwd }));
    });

    it('adds multiple packages with exact versions', async () => {
      vol.fromJSON({
        [path.join(cwd, 'package.json')]: JSON.stringify({
          name: 'expo-app',
          version: '1.0.0',
          dependencies: {
            expo: '^45.0.0',
          },
          devDependencies: {},
        }),
      });

      const npm = new NpmPackageManager({ log, cwd });
      await npm.addDevAsync('eslint@^8.0.0', 'eslint-config-universe@^11.0.0');

      const { devDependencies } = JSON.parse(
        vol.readFileSync(path.join(cwd, 'package.json'), 'utf8').toString()
      );

      expect(devDependencies).toHaveProperty('eslint', '^8.0.0');
      expect(devDependencies).toHaveProperty('eslint-config-universe', '^11.0.0');
      expect(spawnAsync).toBeCalledWith('npm', ['install'], expect.objectContaining({ cwd }));
    });
  });

  describe('addGlobalAsync', () => {
    it('adds a single package globally', async () => {
      const npm = new NpmPackageManager({ log, cwd });
      await npm.addGlobalAsync('expo-cli@^5');

      expect(spawnAsync).toBeCalledWith(
        'npm',
        ['install', '--global', 'expo-cli@^5'],
        expect.anything()
      );
    });

    it('adds multiple packages globally', async () => {
      const npm = new NpmPackageManager({ log, cwd });
      await npm.addGlobalAsync('expo-cli@^5', 'eas-cli');

      expect(spawnAsync).toBeCalledWith(
        'npm',
        ['install', '--global', 'expo-cli@^5', 'eas-cli'],
        expect.anything()
      );
    });
  });

  describe('removeAsync', () => {
    it('removes a single package', async () => {
      const npm = new NpmPackageManager({ log, cwd });
      await npm.removeAsync('metro');

      expect(spawnAsync).toBeCalledWith(
        'npm',
        ['uninstall', 'metro'],
        expect.objectContaining({ cwd })
      );
    });

    it('removes multiple packages', async () => {
      const npm = new NpmPackageManager({ log, cwd });
      await npm.removeAsync('metro', 'jest-haste-map');

      expect(spawnAsync).toBeCalledWith(
        'npm',
        ['uninstall', 'metro', 'jest-haste-map'],
        expect.objectContaining({ cwd })
      );
    });
  });

  describe('versionAsync', () => {
    it('returns version from npm', async () => {
      mockedSpawnAsync.mockResolvedValue({ stdout: '8.9.0\n' } as any);

      const npm = new NpmPackageManager({ log, cwd });

      expect(await npm.versionAsync()).toBe('8.9.0');
      expect(spawnAsync).toBeCalledWith('npm', ['--version'], expect.anything());
    });
  });

  describe('getConfigAsync', () => {
    it('returns a configuration key from npm', async () => {
      mockedSpawnAsync.mockResolvedValue({ stdout: 'https://registry.npmjs.org/\n' } as any);

      const npm = new NpmPackageManager({ log, cwd });

      expect(await npm.getConfigAsync('registry')).toBe('https://registry.npmjs.org/');
      expect(spawnAsync).toBeCalledWith('npm', ['config', 'get', 'registry'], expect.anything());
    });
  });

  describe('removeLockfileAsync', () => {
    it('removes package-lock.json file relative to cwd', async () => {
      vol.fromJSON({
        [path.join(cwd, 'package.json')]: '{}',
        [path.join(cwd, 'package-lock.json')]: '{}',
      });

      const npm = new NpmPackageManager({ log, cwd });
      await npm.removeLockfileAsync();

      expect(vol.existsSync(path.join(cwd, 'package-lock.json'))).toBe(false);
    });

    it('skips removing non-existing npm.lock', async () => {
      vol.fromJSON({
        [path.join(cwd, 'package.json')]: '{}',
      });

      const npm = new NpmPackageManager({ log, cwd });
      await npm.removeLockfileAsync();

      expect(vol.existsSync(path.join(cwd, 'package-lock.json'))).toBe(false);
    });

    it('fails when no cwd is provided', async () => {
      const npm = new NpmPackageManager({ log, cwd: undefined });
      await expect(npm.removeLockfileAsync()).rejects.toThrow('cwd required');
    });
  });

  describe('cleanAsync', () => {
    afterEach(() => vol.reset());

    it('removes node_modules folder relative to cwd', async () => {
      vol.fromJSON({
        [path.join(cwd, 'package.json')]: '{}',
        [path.join(cwd, 'node_modules/expo/package.json')]: '{}',
      });

      const npm = new NpmPackageManager({ log, cwd });
      await npm.cleanAsync();

      expect(vol.existsSync(path.join(cwd, 'node_modules'))).toBe(false);
    });

    it('skips removing non-existing node_modules folder', async () => {
      vol.fromJSON({
        [path.join(cwd, 'package.json')]: '{}',
      });

      const npm = new NpmPackageManager({ log, cwd });
      await npm.cleanAsync();

      expect(vol.existsSync(path.join(cwd, 'node_modules'))).toBe(false);
    });

    it('fails when no cwd is provided', async () => {
      const npm = new NpmPackageManager({ log, cwd: undefined });
      await expect(npm.cleanAsync()).rejects.toThrow('cwd required');
    });
  });
});

describe('NpmStderrTransform', () => {
  const installNormal = `
  npm [33mWARN[39m optional SKIPPING OPTIONAL DEPENDENCY: fsevents@2.3.2 (node_modules\fsevents):
  npm [33mWARN[39m notsup SKIPPING OPTIONAL DEPENDENCY: Unsupported platform for fsevents@2.3.2: wanted {"os":"darwin","arch":"any"} (current: {"os":"win32","arch":"x64"})
  
  added 1006 packages from 692 contributors and audited 1008 packages in 22.785s
  
  53 packages are looking for funding
    run \`npm fund\` for details
  
  found 0 vulnerabilities
  `;

  const installPeerDepsWarning = `
  npm [33mWARN[39m eslint-config-prettier@8.5.0 requires a peer of eslint@>=7.0.0 but none is installed. You must install peer dependencies yourself.
  npm [33mWARN[39m eslint-config-universe@11.0.0 requires a peer of eslint@>=8.10 but none is installed. You must install peer dependencies yourself.
  npm [33mWARN[39m eslint-plugin-react@7.29.4 requires a peer of eslint@^3 || ^4 || ^5 || ^6 || ^7 || ^8 but none is installed. You must install peer dependencies yourself.
  npm [33mWARN[39m eslint-utils@3.0.0 requires a peer of eslint@>=5 but none is installed. You must install peer dependencies yourself.
  npm [33mWARN[39m optional SKIPPING OPTIONAL DEPENDENCY: fsevents@2.3.2 (node_modules\fsevents):
  npm [33mWARN[39m notsup SKIPPING OPTIONAL DEPENDENCY: Unsupported platform for fsevents@2.3.2: wanted {"os":"darwin","arch":"any"} (current: {"os":"win32","arch":"x64"})
  
  audited 1100 packages in 3.462s
  
  98 packages are looking for funding
    run \`npm fund\` for details
  
  found 0 vulnerabilities
  `;

  it('does not filter normal output', () => {
    const stream = new PassThrough()
      .pipe(split(/\r?\n/, (line: string) => line + '\n'))
      .pipe(new NpmStderrTransform())
      .on('data', (data: Buffer) => {
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
    const stream = new PassThrough()
      .pipe(split(/\r?\n/, (line: string) => line + '\n'))
      .pipe(new NpmStderrTransform())
      .on('data', (data: Buffer) => {
        expect(data.toString()).not.toContain('peer dependencies');
      });

    stream.write(installPeerDepsWarning);
    stream.end();

    return new Promise<void>((resolve, reject) => {
      stream.on('error', reject);
      stream.on('end', resolve);
    });
  });
});
