import * as path from 'path';

import { getConfig } from '../Config';

describe('getConfig', () => {
  // Tests the following:
  // - All supported languages are working
  // - ensure `app.config` has higher priority to `app`
  // - generated `.expo` object is created and the language hint is added
  describe('language support', () => {
    xit('parses a ts config', () => {
      const projectRoot = path.resolve(__dirname, './fixtures/language-support/ts');
      const { exp } = getConfig(projectRoot, {
        mode: 'development',
        skipSDKVersionRequirement: true,
      });
      expect(exp.foo).toBe('bar');
      expect(exp.name).toBe('rewrote+ts-config-test');
    });
    it('parses a js config', () => {
      // ensure config is composed (package.json values still exist)
      const projectRoot = path.resolve(__dirname, './fixtures/language-support/js');
      const { exp } = getConfig(projectRoot, {
        mode: 'development',
        skipSDKVersionRequirement: true,
      });
      expect(exp.foo).toBe('bar');
      // Ensure the config is passed the package.json values and mode
      expect(exp.name).toBe('js-config-test+config+development');
      // Ensures that the app.json is read and passed to the method
      expect(exp.slug).toBe('someslug+config');
    });
    it('parses a js config with export default', () => {
      const projectRoot = path.resolve(__dirname, './fixtures/language-support/js');
      const configPath = path.resolve(projectRoot, 'with-default_app.config.js');
      const { exp } = getConfig(projectRoot, {
        mode: 'development',
        skipSDKVersionRequirement: true,
        configPath,
      });
      expect(exp.foo).toBe('bar');
      expect(exp.name).toBe('js-config-test+config-default');
    });
    it('parses a js config that exports json', () => {
      const projectRoot = path.resolve(__dirname, './fixtures/language-support/js');
      const configPath = path.resolve(projectRoot, 'export-json_app.config.js');
      const { exp } = getConfig(projectRoot, {
        mode: 'development',
        skipSDKVersionRequirement: true,
        configPath,
      });
      expect(exp.foo).toBe('bar');
      expect(exp.name).toBe('cool+export-json_app.config');
    });
    xit('parses a yaml config', () => {
      const projectRoot = path.resolve(__dirname, './fixtures/language-support/yaml');
      const { exp } = getConfig(projectRoot, {
        mode: 'development',
        skipSDKVersionRequirement: true,
      });
      expect(exp.foo).toBe('bar');
    });
    xit('parses a toml config', () => {
      const projectRoot = path.resolve(__dirname, './fixtures/language-support/toml');
      const { exp } = getConfig(projectRoot, {
        mode: 'development',
        skipSDKVersionRequirement: true,
      });
      expect(exp.foo).toBe('bar');
    });
    it('parses a json5 config', () => {
      const projectRoot = path.resolve(__dirname, './fixtures/language-support/json5');
      const { exp } = getConfig(projectRoot, {
        mode: 'development',
        skipSDKVersionRequirement: true,
      });
      expect(exp.foo).toBe('bar');
    });
  });
});
