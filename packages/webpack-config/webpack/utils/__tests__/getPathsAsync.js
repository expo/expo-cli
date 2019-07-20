const path = require('path');
const getPathsAsync = require('../getPathsAsync');

const projectRoot = path.resolve(__dirname, '../../../tests/basic');

function normalizePaths(initial, transformString) {
  let result = {};
  for (const prop of Object.keys(initial)) {
    if (typeof initial[prop] === 'string') {
      result[prop] = transformString(initial[prop]);
    } else if (typeof initial[prop] === 'object') {
      result[prop] = normalizePaths(initial[prop], transformString);
    } else {
      result[prop] = initial[prop];
    }
  }
  return result;
}

describe('getPathsAsync', () => {
  it('matches', async () => {
    let locations = await getPathsAsync({ projectRoot });

    let normalized = normalizePaths(locations, value =>
      value.split('packages/webpack-config/').pop()
    );
    expect(normalized).toMatchSnapshot();
  });
  // TODO: Bacon: Add test for resolving entry point
  // TODO: Bacon: Add test for custom config paths
});
