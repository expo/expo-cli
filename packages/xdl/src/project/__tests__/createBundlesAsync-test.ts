import { getConfig, isLegacyImportsEnabled, ProjectTarget } from '@expo/config';
import { bundleAsync } from '@expo/dev-server';

import { getLogger } from '../ProjectUtils';
import { createBundlesAsync } from '../createBundlesAsync';

jest.mock('@expo/dev-server');
jest.mock('@expo/config');
jest.mock('../../tools/resolveEntryPoint');
jest.mock('../ProjectUtils');

describe(createBundlesAsync, () => {
  const expoConfig = {
    name: 'my-app',
    slug: 'my-app',
    sdkVersion: '100.0.0',
  };
  const mockLogger = jest.fn();

  beforeAll(() => {
    (getConfig as any).mockImplementation(() => ({ exp: expoConfig }));
    (isLegacyImportsEnabled as any).mockImplementation(() => true);
    (bundleAsync as any).mockImplementation(() => []);
    (getLogger as any).mockImplementation(() => mockLogger);
  });

  it('passes expected options to devServer', async () => {
    const publishOptions = {
      target: 'managed' as ProjectTarget,
      maxWorkers: 123,
      resetCache: false,
      quiet: true,
    };

    await createBundlesAsync('/', publishOptions, {
      platforms: ['ios'],
      useDevServer: true,
      dev: false,
    });

    expect(bundleAsync).toHaveBeenCalledWith(
      '/',
      expoConfig,
      {
        resetCache: false,
        quiet: true,
        logger: mockLogger,
        maxWorkers: 123,
        unversioned: false,
      },
      [
        {
          dev: false,
          entryPoint: undefined,
          platform: 'ios',
        },
      ]
    );
  });
});
