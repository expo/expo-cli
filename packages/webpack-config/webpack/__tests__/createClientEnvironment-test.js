const { createEnvironmentConstants } = require('@expo/config');
const path = require('path');

const createClientEnvironment = require('../createClientEnvironment');
const getConfigAsync = require('../utils/getConfigAsync');
const getPathsAsync = require('../utils/getPathsAsync');
const normalizePaths = require('../utils/normalizePaths');

const projectRoot = path.resolve(__dirname, '../../tests/basic');
const mode = 'development';
const publicPath = '/';
const env = { projectRoot, mode };

describe('createClientEnvironment', () => {
  it('matches', async () => {
    const config = await getConfigAsync(env);
    const locations = await getPathsAsync(env);

    const publicAppManifest = createEnvironmentConstants(config, locations.production.manifest);
    const normalized = normalizePaths(publicAppManifest, value =>
      value.split('packages/webpack-config/').pop()
    );

    const environmentVariables = createClientEnvironment(env.mode, publicPath, normalized);

    // Add metro value
    expect(environmentVariables.__DEV__).toBe(true);
    // match trusted value
    expect(environmentVariables).toMatchSnapshot();
  });
});
