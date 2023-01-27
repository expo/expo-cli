/* eslint-env node */
import path from 'path';

import { conditionMatchesFile, getRules } from '../../utils/search';
import createAllLoaders from '../createAllLoaders';

const projectRoot = path.resolve(__dirname, '../../../e2e/basic');

const env = { projectRoot, mode: 'development' };

it(`matches expected files`, () => {
  const config = {
    module: {
      rules: [
        {
          oneOf: createAllLoaders(env),
        },
      ],
    },
  };

  const rules = getRules(config);

  const imgMatches = rules.filter(({ rule }) => conditionMatchesFile(rule, 'something.png'));
  expect(imgMatches.length).toBeGreaterThanOrEqual(1);
  expect(imgMatches[0].rule.test).toStrictEqual([
    /\.bmp$/,
    /\.gif$/,
    /\.jpe?g$/,
    /\.png$/,
    /\.svg$/,
  ]);

  const strangeMatches = rules.filter(({ rule }) => conditionMatchesFile(rule, 'something.ide'));
  expect(strangeMatches.length).toBe(1);
});
