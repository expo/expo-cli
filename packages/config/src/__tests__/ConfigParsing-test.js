import * as path from 'path';

import { getConfig } from '../Config';

describe('getConfig', () => {
  // Tests the following:
  // - All supported languages are working
  // - ensure `app.config` has higher priority to `app`
  // - generated `.expo` object is created and the language hint is added
  describe('language support', () => {
    it('parses a ts config', () => {
      const projectRoot = path.resolve(__dirname, './fixtures/language-support/ts');
      const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
      expect(exp.foo).toBe('bar');
      expect(exp.name).toBe('rewrote+ts-config-test');
      expect(exp._expo.configType).toBe('ts');
    });
    it('parses a js config', () => {
      // ensure config is composed (package.json values still exist)
      const projectRoot = path.resolve(__dirname, './fixtures/language-support/js');
      const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
      expect(exp.foo).toBe('bar');
      expect(exp.name).toBe('js-config-test+config');
      expect(exp._expo.configType).toBe('js');
    });
    it('parses a js config with export default', () => {
      const projectRoot = path.resolve(__dirname, './fixtures/language-support/js');
      const configPath = path.resolve(projectRoot, 'with-default_app.config.js');
      const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true, configPath });
      expect(exp.foo).toBe('bar');
      expect(exp.name).toBe('js-config-test+config-default');
      expect(exp._expo.configType).toBe('js');
    });
    it('parses a js config that exports json', () => {
      const projectRoot = path.resolve(__dirname, './fixtures/language-support/js');
      const configPath = path.resolve(projectRoot, 'export-json_app.config.js');
      const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true, configPath });
      expect(exp.foo).toBe('bar');
      expect(exp.name).toBe('cool+export-json_app.config');
      expect(exp._expo.configType).toBe('js');
    });
    it('parses a yaml config', () => {
      const projectRoot = path.resolve(__dirname, './fixtures/language-support/yaml');
      const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
      expect(exp.foo).toBe('bar');
      expect(exp._expo.configType).toBe('yaml');
    });
    it('parses a toml config', () => {
      const projectRoot = path.resolve(__dirname, './fixtures/language-support/toml');
      const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
      expect(exp.foo).toBe('bar');
      expect(exp._expo.configType).toBe('toml');
    });
    it('parses a json5 config', () => {
      const projectRoot = path.resolve(__dirname, './fixtures/language-support/json5');
      const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
      expect(exp.foo).toBe('bar');
      expect(exp._expo.configType).toBe('json');
    });
  });
});
