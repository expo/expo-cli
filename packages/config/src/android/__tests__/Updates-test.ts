import { resolve } from 'path';

import { readAndroidManifestAsync } from '../Manifest';
import * as Updates from '../Updates';

const fixturesPath = resolve(__dirname, 'fixtures');
const sampleManifestPath = resolve(fixturesPath, 'react-native-AndroidManifest.xml');

const config = {
  sdkVersion: '37.0.0',
  slug: 'my-app',
  owner: 'owner',
  updates: {
    enabled: false,
    fallbackToCacheTimeout: 2000,
    checkAutomatically: 'ON_ERROR_RECOVERY',
  },
} as any;

describe('Android Updates config', () => {
  it(`returns correct default values from all getters if no value provided`, () => {
    expect(Updates.getSDKVersion({})).toBe(null);
    expect(Updates.getUpdateUrl({}, null)).toBe(null);
    expect(Updates.getUpdatesCheckOnLaunch({})).toBe('ALWAYS');
    expect(Updates.getUpdatesEnabled({})).toBe(true);
    expect(Updates.getUpdatesTimeout({})).toBe(0);
  });

  it(`returns correct value from all getters if value provided`, () => {
    expect(Updates.getSDKVersion({ sdkVersion: '37.0.0' })).toBe('37.0.0');
    expect(Updates.getUpdateUrl({ slug: 'my-app' }, 'user')).toBe('https://exp.host/@user/my-app');
    expect(Updates.getUpdateUrl({ slug: 'my-app', owner: 'owner' }, 'user')).toBe(
      'https://exp.host/@owner/my-app'
    );
    expect(
      Updates.getUpdatesCheckOnLaunch({ updates: { checkAutomatically: 'ON_ERROR_RECOVERY' } })
    ).toBe('NEVER');
    expect(Updates.getUpdatesCheckOnLaunch({ updates: { checkAutomatically: 'ON_LOAD' } })).toBe(
      'ALWAYS'
    );
    expect(Updates.getUpdatesEnabled({ updates: { enabled: false } })).toBe(false);
    expect(Updates.getUpdatesTimeout({ updates: { fallbackToCacheTimeout: 2000 } })).toBe(2000);
  });

  describe('syncing', () => {
    it('skips adding extra updates config to metadata if enabled is false', async () => {
      const metadata = Updates.syncUpdatesConfigMetaData(config, 'user');

      expect(metadata).toStrictEqual([
        {
          name: 'expo.modules.updates.ENABLED',
          value: 'false',
        },
      ]);
    });
    it('adds updates config to metadata', async () => {
      const metadata = Updates.syncUpdatesConfigMetaData(
        {
          sdkVersion: '37.0.0',
          slug: 'my-app',
          owner: 'owner',
          updates: {
            enabled: true,
            fallbackToCacheTimeout: 2000,
            checkAutomatically: 'ON_ERROR_RECOVERY',
          },
        },
        'user'
      );

      expect(metadata).toStrictEqual([
        {
          name: 'expo.modules.updates.EXPO_UPDATE_URL',
          value: 'https://exp.host/@owner/my-app',
        },
        {
          name: 'expo.modules.updates.EXPO_SDK_VERSION',
          value: '37.0.0',
        },
        {
          name: 'expo.modules.updates.ENABLED',
          value: 'true',
        },
        {
          name: 'expo.modules.updates.EXPO_UPDATES_CHECK_ON_LAUNCH',
          value: 'NEVER',
        },
        {
          name: 'expo.modules.updates.EXPO_UPDATES_LAUNCH_WAIT_MS',
          value: 2000,
        },
      ]);
    });

    it('removes updates config from existing metadata when the expo specific value is missing', async () => {
      const metadata = Updates.syncUpdatesConfigMetaData(
        {
          updates: {
            enabled: false,
          },
          android: {
            metadata: [
              {
                name: 'expo.modules.updates.EXPO_UPDATE_URL',
                value: 'https://exp.host/@owner/my-app',
              },
              {
                name: 'expo.modules.updates.EXPO_SDK_VERSION',
                value: '37.0.0',
              },
              {
                name: 'expo.modules.updates.ENABLED',
                value: 'false',
              },
              {
                name: 'expo.modules.updates.EXPO_UPDATES_CHECK_ON_LAUNCH',
                value: 'NEVER',
              },
              {
                name: 'expo.modules.updates.EXPO_UPDATES_LAUNCH_WAIT_MS',
                value: 2000,
              },
            ],
          },
        } as any,
        null
      );

      // TODO: We end up with two of these if the incoming config already had disabled the metadata.
      expect(metadata).toStrictEqual([
        {
          name: 'expo.modules.updates.ENABLED',
          value: 'false',
        },
        {
          name: 'expo.modules.updates.ENABLED',
          value: 'false',
        },
      ]);
    });
  });
});
