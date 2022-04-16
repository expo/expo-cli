import { vol } from 'memfs';
import path from 'path';

import {
  findWorkspaceRoot,
  isUsingYarn,
  NPM_LOCK_FILE,
  PNPM_LOCK_FILE,
  PNPM_WORKSPACE_FILE,
  resolvePackageManager,
  YARN_LOCK_FILE,
} from '../nodeWorkspaces';

jest.mock('fs');

describe(findWorkspaceRoot, () => {
  // Resolve these paths to avoid posix vs windows path issues when validating
  const workspaceRoot = path.resolve('/monorepo/');
  const projectRoot = path.resolve('/monorepo/packages/test/');

  afterEach(() => vol.reset());

  it('resolves npm workspace root', () => {
    vol.fromJSON(
      {
        'packages/test/package.json': '{}',
        'package.json': JSON.stringify({
          private: true,
          name: 'monorepo',
          workspaces: ['packages/*'],
        }),
        [NPM_LOCK_FILE]: '',
      },
      workspaceRoot
    );

    expect(findWorkspaceRoot(projectRoot)).toBe(workspaceRoot);
    expect(findWorkspaceRoot(projectRoot, 'npm')).toBe(workspaceRoot);
  });

  it('resolves yarn workspace root', () => {
    vol.fromJSON(
      {
        'packages/test/package.json': '{}',
        'package.json': JSON.stringify({
          private: true,
          name: 'monorepo',
          workspaces: ['packages/*'],
        }),
        [YARN_LOCK_FILE]: '',
      },
      workspaceRoot
    );

    expect(findWorkspaceRoot(projectRoot)).toBe(workspaceRoot);
    expect(findWorkspaceRoot(projectRoot, 'yarn')).toBe(workspaceRoot);
  });

  it('resolves pnpm workspace root', () => {
    vol.fromJSON(
      {
        'packages/test/package.json': '{}',
        'package.json': JSON.stringify({
          private: true,
          name: 'monorepo',
        }),
        [PNPM_LOCK_FILE]: '',
        [PNPM_WORKSPACE_FILE]: '',
      },
      workspaceRoot
    );

    expect(findWorkspaceRoot(projectRoot)).toBe(workspaceRoot);
    expect(findWorkspaceRoot(projectRoot, 'pnpm')).toBe(workspaceRoot);
  });
});

describe(resolvePackageManager, () => {
  const workspaceRoot = '/monorepo/';
  const projectRoot = '/monorepo/packages/test/';

  afterEach(() => vol.reset());

  it('resolves npm from monorepo', () => {
    vol.fromJSON(
      {
        'packages/test/package.json': '{}',
        'package.json': JSON.stringify({
          private: true,
          name: 'monorepo',
          workspaces: ['packages/*'],
        }),
        [NPM_LOCK_FILE]: '',
      },
      workspaceRoot
    );

    expect(resolvePackageManager(projectRoot)).toBe('npm');
    expect(resolvePackageManager(projectRoot, 'npm')).toBe('npm');
  });

  it('resolves yarn from project', () => {
    vol.fromJSON(
      {
        'package.json': '{}',
        [YARN_LOCK_FILE]: '',
      },
      projectRoot
    );

    expect(resolvePackageManager(projectRoot)).toBe('yarn');
    expect(resolvePackageManager(projectRoot, 'yarn')).toBe('yarn');
  });

  it('resolves pnpm from project', () => {
    vol.fromJSON(
      {
        'package.json': '{}',
        [PNPM_LOCK_FILE]: '',
        [PNPM_WORKSPACE_FILE]: '',
      },
      projectRoot
    );

    expect(resolvePackageManager(projectRoot)).toBe('pnpm');
    expect(resolvePackageManager(projectRoot, 'pnpm')).toBe('pnpm');
  });
});

describe(isUsingYarn, () => {
  const projectRoot = '/foo/';

  afterEach(() => vol.reset());

  it('returns true for yarn projects', () => {
    vol.fromJSON({ 'package.json': '{}', [YARN_LOCK_FILE]: '' }, projectRoot);
    expect(isUsingYarn(projectRoot)).toBe(true);
  });

  it('returns false for npm projects', () => {
    vol.fromJSON({ 'package.json': '{}', [NPM_LOCK_FILE]: '' }, projectRoot);
    expect(isUsingYarn(projectRoot)).toBe(false);
  });

  it('returns false for pnpm projects', () => {
    vol.fromJSON({ 'package.json': '{}', [PNPM_LOCK_FILE]: '' }, projectRoot);
    expect(isUsingYarn(projectRoot)).toBe(false);
  });
});
