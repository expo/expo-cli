import { resolve } from 'path';

import { ExpoConfig } from '../../Config.types';
import { getMainApplication, readAndroidManifestAsync } from '../Manifest';
import {
  applyAndroidManifestChanges,
  META_DATA_NOTIFICATION_ICON,
  META_DATA_NOTIFICATION_ICON_COLOR,
  NOTIFICATION_ICON_COLOR_RESOURCE,
  NOTIFICATION_ICON_RESOURCE,
} from '../Notifications';

const fixturesPath = resolve(__dirname, 'fixtures');
const sampleManifestPath = resolve(fixturesPath, 'react-native-AndroidManifest.xml');
const notificationConfig: ExpoConfig = {
  name: 'lol',
  slug: 'lol',
  notification: {
    icon: '/app/assets/notificationIcon.png',
    color: '#00ff00',
  },
};

describe('Applies proper Android Notification configuration to AndroidManifest.xml', () => {
  it('adds config if provided & does not duplicate', async () => {
    let androidManifestJson = await readAndroidManifestAsync(sampleManifestPath);

    androidManifestJson = await applyAndroidManifestChanges(
      notificationConfig,
      androidManifestJson
    );
    // Run this twice to ensure copies don't get added.
    androidManifestJson = await applyAndroidManifestChanges(
      notificationConfig,
      androidManifestJson
    );

    const mainApplication = getMainApplication(androidManifestJson);

    const notificationIcon = mainApplication['meta-data'].filter(
      e => e['$']['android:name'] === META_DATA_NOTIFICATION_ICON
    );
    expect(notificationIcon).toHaveLength(1);
    expect(notificationIcon[0]['$']['android:resource']).toMatch(NOTIFICATION_ICON_RESOURCE);

    const notificationColor = mainApplication['meta-data'].filter(
      e => e['$']['android:name'] === META_DATA_NOTIFICATION_ICON_COLOR
    );
    expect(notificationColor).toHaveLength(1);
    expect(notificationColor[0]['$']['android:resource']).toMatch(NOTIFICATION_ICON_COLOR_RESOURCE);
  });

  it('removes existing config if null is provided', async () => {
    let androidManifestJson = await readAndroidManifestAsync(sampleManifestPath);

    androidManifestJson = await applyAndroidManifestChanges(
      notificationConfig,
      androidManifestJson
    );
    // Now let's get rid of the configuration:
    androidManifestJson = await applyAndroidManifestChanges({} as ExpoConfig, androidManifestJson);

    const mainApplication = getMainApplication(androidManifestJson);

    const notificationIcon = mainApplication['meta-data'].filter(
      e => e['$']['android:name'] === META_DATA_NOTIFICATION_ICON
    );
    expect(notificationIcon).toHaveLength(0);

    const notificationColor = mainApplication['meta-data'].filter(
      e => e['$']['android:name'] === META_DATA_NOTIFICATION_ICON_COLOR
    );
    expect(notificationColor).toHaveLength(0);
  });
});
