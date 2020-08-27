import { join } from 'path';

import { getConfigFilePaths, modifyConfigAsync } from '../Config';
import { getDynamicConfig, getStaticConfig } from '../getConfig';

describe('modifyConfigAsync', () => {
  it(`can write to a static only config`, async () => {
    const { type, config } = await modifyConfigAsync(
      join(__dirname, 'fixtures/behavior/static-override'),
      { foo: 'bar' },
      { skipSDKVersionRequirement: true },
      { dryRun: true }
    );
    expect(type).toBe('success');
    expect(config.foo).toBe('bar');
  });
  it(`cannot write to a dynamic config`, async () => {
    const { type, config } = await modifyConfigAsync(
      join(__dirname, 'fixtures/behavior/dynamic-and-static'),
      {},
      { skipSDKVersionRequirement: true },
      { dryRun: true }
    );
    expect(type).toBe('warn');
    expect(config).toBe(null);
  });
  it(`cannot write to a project without a config`, async () => {
    const { type, config } = await modifyConfigAsync(
      join(__dirname, 'fixtures/behavior/no-config'),
      {},
      { skipSDKVersionRequirement: true },
      { dryRun: true }
    );
    expect(type).toBe('fail');
    expect(config).toBe(null);
  });
});

describe('getDynamicConfig', () => {
  // This tests error are thrown properly and ensures that a more specific
  // config is used instead of defaulting to a valid substitution.
  it(`throws a useful error for dynamic configs with a syntax error`, () => {
    const paths = getConfigFilePaths(join(__dirname, 'fixtures/behavior/syntax-error'));
    expect(() => getDynamicConfig(paths.dynamicConfigPath, {})).toThrowError(
      'Unexpected token (3:4)'
    );
  });
  it(`exports a function`, () => {
    expect(
      getDynamicConfig(
        join(__dirname, 'fixtures/behavior/dynamic-export-types/exports-function.app.config.js'),
        {}
      ).exportedObjectType
    ).toBe('function');
  });
  it(`exports an object`, () => {
    expect(
      getDynamicConfig(
        join(__dirname, 'fixtures/behavior/dynamic-export-types/exports-object.app.config.js'),
        {}
      ).exportedObjectType
    ).toBe('object');
  });

  describe('process.cwd in a child process', () => {
    const originalCwd = process.cwd();
    const projectRoot = join(__dirname, 'fixtures/behavior/dynamic-cwd');

    beforeEach(() => {
      process.chdir(__dirname);
    });

    afterEach(() => {
      process.chdir(originalCwd);
    });

    it('process.cwd in read-config script is not equal to the project root', () => {
      const { config } = getDynamicConfig(join(projectRoot, 'app.config.ts'), {});
      expect(config.processCwd).toBe(__dirname);
    });
    it('process.cwd in read-config script is equal to the project root', () => {
      const { config } = getDynamicConfig(join(projectRoot, 'app.config.ts'), {
        projectRoot,
      });
      expect(config.processCwd).toBe(projectRoot);
    });
  });
});

describe('getStaticConfig', () => {
  // This tests error are thrown properly and ensures that a more specific
  // config is used instead of defaulting to a valid substitution.
  it(`uses app.config.json instead of app.json if both exist`, () => {
    const paths = getConfigFilePaths(join(__dirname, 'fixtures/behavior/static-override'));
    expect(paths.staticConfigPath).toMatch(/app\.config\.json/);

    expect(getStaticConfig(paths.staticConfigPath).name).toBe('app-config-json');
  });
});
