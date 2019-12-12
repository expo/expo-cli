/* eslint-env node */

import path from 'path';
import getConfig from '../getConfig';
import { normalizePaths } from '../../utils';

const projectRoot = path.resolve(__dirname, '../../../tests/basic');
const mode = 'development';
const env = { projectRoot, mode };

it(`has consistent defaults`, () => {
  const config = getConfig(env);
  const normalized = normalizePaths(config, value => value.split('packages/webpack-config/').pop());
  expect(normalized).toMatchSnapshot();
});
