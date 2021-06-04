import { vol } from 'memfs';

import { getPublishExpConfigAsync } from '../getPublishExpConfigAsync';

jest.mock('fs');

describe(getPublishExpConfigAsync, () => {
  afterAll(() => {
    vol.reset();
  });

  const runtimeVersion = 'one';
  const sdkVersion = '40.0.0';
  it('throws if sdkVersion is not specified', async () => {
    vol.fromJSON(
      {
        'package.json': JSON.stringify({}),
        'app.json': JSON.stringify({
          name: 'hello',
          slug: 'hello',
          version: '1.0.0',
          runtimeVersion,
          platforms: [],
        }),
      },
      'runtimeVersion'
    );
    await expect(
      getPublishExpConfigAsync('runtimeVersion', { releaseChannel: 'default' })
    ).rejects.toThrow(
      'Config is missing an SDK version. See https://docs.expo.io/bare/installing-updates/'
    );
  });
  it('reads sdkVersion from node module', async () => {
    vol.fromJSON(
      {
        'package.json': JSON.stringify({}),
        'app.json': JSON.stringify({
          name: 'hello',
          slug: 'hello',
          version: '1.0.0',
          platforms: [],
        }),
        'node_modules/expo/package.json': JSON.stringify({
          version: sdkVersion,
        }),
      },
      'sdkVersion'
    );
    const config = await getPublishExpConfigAsync('sdkVersion', { releaseChannel: 'default' });
    expect(config.exp).toMatchObject({ sdkVersion });
  });
  it('reads sdkVersion from app.json', async () => {
    vol.fromJSON(
      {
        'package.json': JSON.stringify({}),
        'app.json': JSON.stringify({
          name: 'hello',
          slug: 'hello',
          version: '1.0.0',
          sdkVersion,
          platforms: [],
        }),
      },
      'sdkVersionInAppDotJson'
    );
    const config = await getPublishExpConfigAsync('sdkVersionInAppDotJson', {
      releaseChannel: 'default',
    });
    expect(config.exp).toMatchObject({ sdkVersion });
  });
});
