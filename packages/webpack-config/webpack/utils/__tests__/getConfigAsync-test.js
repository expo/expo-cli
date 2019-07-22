import path from 'path';
import getConfigAsync from '../getConfigAsync';
import normalizePaths from '../normalizePaths';

const projectRoot = path.resolve(__dirname, '../../../tests/basic');

const mode = 'development';

const env = { projectRoot, mode };

describe('getConfigAsync', () => {
  it('matches', async () => {
    const config = await getConfigAsync(env);
    const normalized = normalizePaths(config, value =>
      value.split('packages/webpack-config/').pop()
    );
    // match trusted value
    expect(normalized).toMatchSnapshot();
  });
});
