import { vol } from 'memfs';

import { moduleNameFromPath, projectHasModule } from '../Modules';

jest.mock('fs');

describe('moduleNameFromPath', () => {
  it(`returns the module name from a path`, () => {
    expect(moduleNameFromPath('foo/bar/expo.js')).toBe('foo');
    expect(moduleNameFromPath('foo')).toBe('foo');
  });
  it(`returns the module name from a path with org`, () => {
    expect(moduleNameFromPath('@myorg/somn/bar/expo.js')).toBe('@myorg/somn');
  });
  it(`returns the org name if the package is missing`, () => {
    expect(moduleNameFromPath('@myorg')).toBe('@myorg');
  });
});

describe('projectHasModule', () => {
  beforeAll(() => {
    const packageJson = JSON.stringify({
      name: 'testing123',
      version: '0.1.0',
      main: 'index.js',
    });

    vol.fromJSON({
      '/repo/packages/foo/package.json': packageJson,
      '/repo/packages/foo/node_modules/expo/package.json': JSON.stringify({ name: 'project-expo' }),
      '/repo/node_modules/expo/package.json': JSON.stringify({ name: 'monorepo-expo' }),
    });
  });
  afterAll(() => vol.reset());

  it(`returns the module path from a monorepo`, () => {
    expect(projectHasModule('expo', '/repo/packages/foo', { nodeModulesPath: '/repo' })).toBe(
      '/repo/node_modules/expo'
    );
  });

  it(`returns the module path from a local package`, () => {
    expect(projectHasModule('expo', '/repo/packages/foo', {})).toBe(
      '/repo/packages/foo/node_modules/expo'
    );
  });
});
