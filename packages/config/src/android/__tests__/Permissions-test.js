import { dirname, resolve } from 'path';
import fs from 'fs-extra';
import { getAndroidPermissions, requiredPermissions, setAndroidPermissions } from '../Permissions';
import { readAndroidManifestAsync } from '../Manifest';

const fixturesPath = resolve(__dirname, 'fixtures');
const sampleManifestPath = resolve(fixturesPath, 'react-native-AndroidManifest.xml');

describe('Android permissions', () => {
  it(`returns empty array if no android permissions key is provided`, () => {
    expect(getAndroidPermissions({})).toMatchObject([]);
  });

  it(`returns android permissions if array is provided`, () => {
    expect(
      getAndroidPermissions({ android: { permissions: ['CAMERA', 'RECORD_AUDIO'] } })
    ).toMatchObject(['CAMERA', 'RECORD_AUDIO']);
  });

  describe('adds permissions in AndroidManifest.xml if given', () => {
    const projectDirectory = resolve(fixturesPath, 'tmp/');
    const appManifestPath = resolve(fixturesPath, 'tmp/android/app/src/main/AndroidManifest.xml');

    beforeAll(async () => {
      await fs.ensureDir(dirname(appManifestPath));
      await fs.copyFile(sampleManifestPath, appManifestPath);
    });

    afterAll(async () => {
      await fs.remove(resolve(fixturesPath, 'tmp/'));
    });

    it('adds permissions if not present, does not duplicate permissions', async () => {
      let givenPermissions = [
        'android.permission.READ_CONTACTS',
        'com.android.launcher.permission.INSTALL_SHORTCUT',
        'com.android.launcher.permission.INSTALL_SHORTCUT',
      ];
      expect(
        await setAndroidPermissions(
          { android: { permissions: givenPermissions } },
          projectDirectory
        )
      ).toBe(true);

      let manifestPermissionsJSON = (await readAndroidManifestAsync(appManifestPath)).manifest[
        'uses-permission'
      ];
      let manifestPermissions = manifestPermissionsJSON.map(e => e['$']['android:name']);

      expect(
        manifestPermissions.every(permission =>
          givenPermissions.concat(requiredPermissions).includes(permission)
        )
      ).toBe(true);
      expect(
        manifestPermissions.filter(e => e === 'com.android.launcher.permission.INSTALL_SHORTCUT')
      ).toHaveLength(1);
    });
  });
});
