import path from 'path';

import { conditionMatchesFile, getRules } from '../../utils/loaders';
import createAllLoaders from '../createAllLoaders';

const projectRoot = path.resolve(__dirname, '../../../tests/basic');

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
  expect(imgMatches[0].rule.test).toStrictEqual(/\.(gif|jpe?g|png|svg)$/);

  const htmlMatches = rules.filter(({ rule }) => conditionMatchesFile(rule, 'something.html'));
  expect(htmlMatches.length).toBeGreaterThanOrEqual(1);
  expect(htmlMatches[0].rule.test).toStrictEqual(/\.html$/);

  const strangeMatches = rules.filter(({ rule }) => conditionMatchesFile(rule, 'something.ide'));
  expect(strangeMatches.length).toBe(1);
});
