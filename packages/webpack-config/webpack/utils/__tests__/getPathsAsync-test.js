import path from 'path';
import getPathsAsync from '../getPathsAsync';
import normalizePaths from '../normalizePaths';

const projectRoot = path.resolve(__dirname, '../../../tests/basic');

it(`has consistent defaults`, async () => {
  const locations = await getPathsAsync({ projectRoot });

  const normalized = normalizePaths(locations, value =>
    value.split('packages/webpack-config/').pop()
  );
  expect(normalized).toMatchSnapshot();
});
// TODO: Bacon: Add test for resolving entry point
// TODO: Bacon: Add test for custom config paths
