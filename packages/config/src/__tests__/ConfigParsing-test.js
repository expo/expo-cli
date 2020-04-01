import * as path from 'path';

import { getConfig, setCustomConfigPath } from '../Config';

const fixtures = {
  customLocationJson: path.resolve(__dirname, 'fixtures/behavior/custom-location-json'),
  syntaxError: path.resolve(__dirname, 'fixtures/behavior/syntax-error'),
};

describe('getConfig', () => {
  // Tests the following:
  // - All supported languages are working
  // - ensure `app.config` has higher priority to `app`
  // - generated `.expo` object is created and the language hint is added
  describe('language support', () => {
    it('parses a ts config', () => {
      const projectRoot = path.resolve(__dirname, './fixtures/language-support/ts');
      const { exp } = getConfig(projectRoot, {
        skipSDKVersionRequirement: true,
      });
      expect(exp.foo).toBe('bar+value');
      expect(exp.name).toBe('rewrote+ts-config-test');
    });
    it('parses a js config', () => {
      // ensure config is composed (package.json values still exist)
      const projectRoot = path.resolve(__dirname, './fixtures/language-support/js');
      const { exp } = getConfig(projectRoot, {
        skipSDKVersionRequirement: true,
      });
      expect(exp.foo).toBe('bar');
      // Ensure the config is passed the package.json values
      expect(exp.name).toBe('js-config-test+config');
      // Ensures that the app.json is read and passed to the method
      expect(exp.slug).toBe('someslug+config');
    });
    it('parses a js config with export default', () => {
      const projectRoot = path.resolve(__dirname, './fixtures/language-support/js');
      const configPath = path.resolve(projectRoot, 'with-default_app.config.js');
      const { exp } = getConfig(projectRoot, {
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
        skipSDKVersionRequirement: true,
        configPath,
      });
      expect(exp.foo).toBe('bar');
      expect(exp.name).toBe('cool+export-json_app.config');
    });
    xit('parses a yaml config', () => {
      const projectRoot = path.resolve(__dirname, './fixtures/language-support/yaml');
      const { exp } = getConfig(projectRoot, {
        skipSDKVersionRequirement: true,
      });
      expect(exp.foo).toBe('bar');
    });
    xit('parses a toml config', () => {
      const projectRoot = path.resolve(__dirname, './fixtures/language-support/toml');
      const { exp } = getConfig(projectRoot, {
        skipSDKVersionRequirement: true,
      });
      expect(exp.foo).toBe('bar');
    });
  });

  function resetAllCustomFixtureLocations() {
    // Reset custom paths
    for (const fixturePath of Object.values(fixtures)) {
      setCustomConfigPath(fixturePath, undefined);
    }
  }

  describe('behavior', () => {
    beforeEach(() => {
      resetAllCustomFixtureLocations();
    });

    // Test that setCustomConfigPath works to read custom json configs.
    it('uses a custom location', () => {
      const projectRoot = path.resolve(fixtures.customLocationJson);
      const customConfigPath = path.resolve(projectRoot, 'src/app.staging.json');
      setCustomConfigPath(projectRoot, customConfigPath);

      const { exp } = getConfig(projectRoot, {
        skipSDKVersionRequirement: true,
      });
      // Ensure the expo object is reduced out. See #1542.
      // Also test that a nested expo object isn't recursively reduced.
      expect(exp.expo).toStrictEqual({ name: 'app-staging-expo-expo-name' });
      // name is read from the correct config at the custom location.
      expect(exp.name).toBe('app-staging-expo-name');
      // slug should be copied from name if it wasn't defined.
      expect(exp.slug).toBe('app-staging-expo-name');
      // Version comes from package.json in the root.
      expect(exp.version).toBe('1.0.0');
      // No packages are installed and no platforms are specified.
      expect(exp.platforms).toEqual(expect.any(Array));

      // Ensure this works
      resetAllCustomFixtureLocations();
      // After the reset, read the root config and ensure it doesn't match the custom location config.
      const { exp: baseExp } = getConfig(projectRoot, {
        skipSDKVersionRequirement: true,
      });
      // name is read from the default config.
      expect(baseExp.name).toBe('app-expo-name');
      // A base app.json is parsed differently, ensure the app.json parsing doesn't accidentally reduce the "expo" object multiple times.
      expect(baseExp.expo).toStrictEqual({ name: 'app-expo-expo-name' });
    });
  });
});
