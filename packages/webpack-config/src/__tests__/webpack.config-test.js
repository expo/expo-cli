import { dirname } from 'path';

import createConfig from '..';

const projectRoot = dirname(require.resolve('@expo/webpack-config/e2e/basic'));

describe(`ios`, () => {
  it('ios development', async () => {
    const config = await createConfig({ mode: 'development', platform: 'ios', projectRoot });
    expect(config).toMatchSnapshot();
  });
  it('ios production', async () => {
    const config = await createConfig({ mode: 'production', platform: 'ios', projectRoot });
    expect(config).toMatchSnapshot();
  });
});
describe(`web`, () => {
  it('web development', async () => {
    const config = await createConfig({ mode: 'development', platform: 'web', projectRoot });
    expect(config).toMatchSnapshot();
  });

  it('web production', async () => {
    const config = await createConfig({ mode: 'production', platform: 'web', projectRoot });
    expect(config).toMatchSnapshot();
  });
});
