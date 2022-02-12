/* eslint-env node */
import path from 'path';

import { conditionMatchesFile, getRules } from '../../utils/search';
import { getBabelLoaderRule } from '../createAllLoaders';

const projectRoot = path.resolve(__dirname, '../../../e2e/basic');

describe('preset', () => {
  for (const platform of ['ios', 'web']) {
    it(`Uses a known cache directory for platform ${platform}`, () => {
      const env = {
        projectRoot,
        platform,
        mode: 'development',
        config: {
          web: {
            build: {
              babel: {
                include: ['custom-lib'],
                use: { options: { cacheIdentifier: 'custom-value-to-skip-babel-config-error' } },
              },
            },
          },
        },
      };

      const babelLoader = getBabelLoaderRule(env);
      expect(babelLoader.use.options.cacheDirectory).toMatch(
        `.expo${path.sep}${platform}${path.sep}cache${path.sep}development${path.sep}babel-loader`
      );
    });
  }

  it(`uses an optimized loader in production`, () => {
    const env = {
      projectRoot,
      mode: 'production',
    };
    const babelLoader = getBabelLoaderRule(env);
    expect(babelLoader.use.options.compact).toBe(true);
    expect(babelLoader.use.options.cacheCompression).toBe(false);
    expect(babelLoader.use.options.caller.mode).toBe('production');
  });
});

describe('includes', () => {
  let rules;

  beforeAll(() => {
    const env = {
      projectRoot,
      mode: 'development',
      config: {
        web: {
          build: {
            babel: {
              include: ['custom-lib'],
              use: { options: { cacheIdentifier: 'custom-value-to-skip-babel-config-error' } },
            },
          },
        },
      },
    };

    rules = getRules({
      module: {
        rules: [getBabelLoaderRule(env)],
      },
    });
  });

  for (const library of [
    'react-native-foo',
    'custom-lib',
    'expo-foo',
    '@expo/foo',
    'react-navigation-foo',
  ]) {
    it(`matches against libraries ${library}`, () => {
      const matches = rules.filter(({ rule }) =>
        conditionMatchesFile(rule, path.join(projectRoot, 'node_modules', library, `foo.js`))
      );
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  }

  for (const library of ['vue-foo', 'angular-foo', 'not-expo-foo', 'lodash']) {
    it(`doesn't match against libraries ${library}`, () => {
      const matches = rules.filter(({ rule }) =>
        conditionMatchesFile(rule, path.join(projectRoot, 'node_modules', library, `foo.js`))
      );
      expect(matches.length).toBe(0);
    });
  }
  for (const file of ['js', 'jsx', 'tsx', 'ts', 'mjs']) {
    it(`matches against ${file}`, () => {
      const matches = rules.filter(({ rule }) =>
        conditionMatchesFile(rule, path.join(projectRoot, `foo.${file}`))
      );
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  }
  for (const file of ['xml', 'json', 'foo', 'css', 'png']) {
    it(`doesn't match against ${file}`, () => {
      const matches = rules.filter(({ rule }) =>
        conditionMatchesFile(rule, path.join(projectRoot, `foo.${file}`))
      );
      expect(matches.length).toBe(0);
    });
  }
});
