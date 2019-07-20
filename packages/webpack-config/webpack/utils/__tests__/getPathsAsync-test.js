const path = require('path');
const getPathsAsync = require('../getPathsAsync');

const projectRoot = path.resolve(__dirname, '../../../tests/basic');
const normalizePaths = require('../normalizePaths');

describe('getPathsAsync', () => {
  it('matches', async () => {
    const locations = await getPathsAsync({ projectRoot });

    const normalized = normalizePaths(locations, value =>
      value.split('packages/webpack-config/').pop()
    );
    expect(normalized).toMatchSnapshot();
  });
  // TODO: Bacon: Add test for resolving entry point
  // TODO: Bacon: Add test for custom config paths
});
