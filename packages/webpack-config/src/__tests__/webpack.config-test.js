import { dirname } from 'path';

import normalizePaths from '../utils/normalizePaths';
import createConfig from '..';

const projectRoot = dirname(require.resolve('@expo/webpack-config/e2e/basic'));

xdescribe(`ios`, () => {
  it('ios development', async () => {
    const config = await createConfig({ mode: 'development', platform: 'ios', projectRoot });
    const normalized = normalizePaths(config, value =>
      value.split('packages/webpack-config/').pop()
    );

    expect(normalized).toMatchSnapshot();
  });
  it('ios production', async () => {
    const config = await createConfig({ mode: 'production', platform: 'ios', projectRoot });
    const normalized = normalizePaths(config, value =>
      value.split('packages/webpack-config/').pop()
    );

    expect(normalized).toMatchSnapshot();
  });
});
describe(`web`, () => {
  xit('web development', async () => {
    const config = await createConfig({ mode: 'development', platform: 'web', projectRoot });
    const normalized = normalizePaths(config, value =>
      value.split('packages/webpack-config/').pop()
    );

    expect(normalized).toMatchSnapshot();
  });

  it('web production', async () => {
    const config = await createConfig({ mode: 'production', platform: 'web', projectRoot });
    const plugins = config.plugins;
    config.plugins = [];
    // Just use plugin names in order
    for (const plugin of plugins) {
      config.plugins.push(plugin.constructor.name);
    }
    const normalized = normalizePaths(config, value =>
      value.split('packages/webpack-config/').pop()
    );

    expect(normalized).toMatchSnapshot();
  });
});
