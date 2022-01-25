/* eslint-env node */

import path from 'path';

import createWebpackConfigAsync from '../..';
import * as LoaderUtils from '../search';

const projectRoot = path.resolve(__dirname, '../../../e2e/basic');

it(`getExpoBabelLoader gets the Expo babel loader`, async () => {
  const config = await createWebpackConfigAsync({
    projectRoot,
    mode: 'development',
    platform: 'web',
  });

  const loader = LoaderUtils.getExpoBabelLoader(config);
  expect(loader).toBeDefined();
  expect(loader.use.options.caller.__dangerous_rule_id).toBe('expo-babel-loader');
});

it(`getPluginsByName gets a known plugin`, async () => {
  const config = await createWebpackConfigAsync({
    projectRoot,
    mode: 'development',
    platform: 'web',
  });

  const plugins = LoaderUtils.getPluginsByName(config, 'WebpackManifestPlugin');
  expect(plugins.length).toBe(1);
  const expectedPlugin = plugins[0];
  expect(config.plugins[expectedPlugin.index]).toBe(expectedPlugin.plugin);
});

it(`gets all nested rules`, async () => {
  const config = {
    module: {
      rules: [
        {
          test: 'first',
        },
        {
          /* Empty Loader */
        },
        {
          oneOf: [{ test: 'foo' }, { exclude: 'bar' }],
        },
        { test: 'last' },
      ],
    },
  };

  const rules = LoaderUtils.getRules(config);
  expect(rules.length).toBe(5);
});

it(`can get rules by matching files`, async () => {
  const config = {
    module: {
      rules: [
        {
          test: /\.(ttf|otf|woff)$/,
        },
      ],
    },
  };

  const supportedFonts = ['ttf', 'otf', 'woff'];
  const testFontFileNames = supportedFonts.map(ext =>
    path.resolve(projectRoot, `cool-font.${ext}`)
  );

  const rules = LoaderUtils.getRulesByMatchingFiles(config, testFontFileNames);

  for (const file of Object.keys(rules)) {
    const rulesForFile = rules[file];
    expect(rulesForFile.length).toBe(1);
  }
});

it(`can get rules by matching files`, async () => {
  const config = {
    module: {
      rules: [
        {
          test: /\.(ttf|otf|woff)$/,
        },
      ],
    },
  };

  const supportedFonts = ['ttf', 'otf', 'woff'];
  const testFontFileNames = supportedFonts.map(ext =>
    path.resolve(projectRoot, `cool-font.${ext}`)
  );

  const rules = LoaderUtils.getRulesByMatchingFiles(config, testFontFileNames);

  for (const file of Object.keys(rules)) {
    const rulesForFile = rules[file];
    expect(rulesForFile.length).toBe(1);
  }
});

it(`can match files against conditions`, async () => {
  expect(LoaderUtils.conditionMatchesFile(/\.(ttf|otf|woff)$/, 'some.ttf')).toBe(true);
  expect(
    LoaderUtils.conditionMatchesFile({ test: /\.(ttf|otf|woff)$/, exclude: ['some'] }, 'some.ttf')
  ).toBe(false);
  expect(LoaderUtils.conditionMatchesFile(null, 'some.ttf')).toBe(false);
  expect(LoaderUtils.conditionMatchesFile(file => file === 'some.ttf', 'some.ttf')).toBe(true);
  expect(LoaderUtils.conditionMatchesFile({ include: ['some'] }, 'some.ttf')).toBe(true);
});
