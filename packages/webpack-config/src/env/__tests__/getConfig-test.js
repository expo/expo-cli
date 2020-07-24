/* eslint-env node */

import path from 'path';

import { normalizePaths } from '../../utils';
import getConfig from '../getConfig';

const projectRoot = path.resolve(__dirname, '../../../e2e/basic');
const env = { projectRoot };

it(`has consistent defaults`, () => {
  const config = getConfig(env);
  const normalized = normalizePaths(config, value => value.split('packages/webpack-config/').pop());

  expect(Array.isArray(normalized.platforms)).toBe(true);
  expect(typeof normalized.icon).toBe('string');
});
