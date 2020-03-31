import { dirname, resolve } from 'path';
import fs from 'fs-extra';
import * as Manifest from '../Manifest';
const fixturesPath = resolve(__dirname, 'fixtures');
const manifestPath = resolve(fixturesPath, 'react-native-AndroidManifest.xml');

describe('Permissions', () => {
  it(`adds a new permission`, async () => {
    const manifest = await Manifest.readAndroidManifestAsync(manifestPath);
    const didAdd = Manifest.ensurePermission(manifest, 'EXPO_TEST_PERMISSION');
    const permissions = Manifest.getPermissions(manifest);
    expect(didAdd).toBe(true);
    expect(permissions).toContain('android.permission.EXPO_TEST_PERMISSION');
    expect(permissions.length).toBe(2);
  });

  it(`prevents adding a duplicate permission`, async () => {
    const manifest = await Manifest.readAndroidManifestAsync(manifestPath);
    const didAdd = Manifest.ensurePermission(manifest, 'INTERNET');
    const permissions = Manifest.getPermissions(manifest);
    expect(didAdd).toBe(false);
    expect(permissions).toContain('android.permission.INTERNET');
    expect(permissions.length).toBe(1);
  });

  it(`ensures multiple permissions`, async () => {
    const manifest = await Manifest.readAndroidManifestAsync(manifestPath);
    const permissionsToAdd = ['VALUE_1', 'VALUE_2'];
    const results = Manifest.ensurePermissions(manifest, permissionsToAdd);
    expect(results).toMatchSnapshot();
    expect(Object.values(results)).toStrictEqual([true, true]);

    expect(Manifest.getPermissions(manifest).length).toBe(3);
  });

  it(`removes permissions by name`, async () => {
    const manifest = await Manifest.readAndroidManifestAsync(manifestPath);
    expect(Manifest.ensurePermission(manifest, 'VALUE_TO_REMOVE_1')).toBe(true);
    expect(Manifest.ensurePermission(manifest, 'VALUE_TO_REMOVE_2')).toBe(true);
    expect(Manifest.getPermissions(manifest).length).toBe(3);

    Manifest.removePermissions(manifest, ['VALUE_TO_REMOVE_1', 'VALUE_TO_REMOVE_2']);
    expect(Manifest.getPermissions(manifest).length).toBe(1);
  });

  it(`removes all permissions`, async () => {
    const manifest = await Manifest.readAndroidManifestAsync(manifestPath);
    expect(Manifest.ensurePermission(manifest, 'VALUE_TO_REMOVE_1')).toBe(true);
    expect(Manifest.ensurePermission(manifest, 'VALUE_TO_REMOVE_2')).toBe(true);
    expect(Manifest.getPermissions(manifest).length).toBe(3);

    Manifest.removePermissions(manifest);

    expect(Manifest.getPermissions(manifest).length).toBe(0);
  });

  it(`can write with a pretty format`, async () => {
    const manifest = await Manifest.readAndroidManifestAsync(manifestPath);
    expect(Manifest.ensurePermission(manifest, 'NEW_PERMISSION_1')).toBe(true);
    expect(Manifest.ensurePermission(manifest, 'NEW_PERMISSION_2')).toBe(true);
    expect(Manifest.getPermissions(manifest).length).toBe(3);

    expect(Manifest.format(manifest)).toMatchSnapshot();
  });

  describe('E2E', () => {
    beforeEach(async () => {
      await fs.remove(resolve(fixturesPath, 'android'));
    });
    afterAll(async () => {
      await fs.remove(resolve(fixturesPath, 'android'));
    });

    const appManifestPath = resolve(fixturesPath, 'android/app/src/main/AndroidManifest.xml');

    it(`replaces and persists permissions`, async () => {
      await fs.ensureDir(dirname(appManifestPath));
      await fs.copyFile(manifestPath, appManifestPath);

      const permissionsToPersist = [
        'CAMERA',
        'android.permission.WRITE_CALENDAR',
        'com.anddoes.launcher.permission.UPDATE_COUNT',
        'com.sonyericsson.home.permission.BROADCAST_BADGE',
      ];
      expect(
        await Manifest.persistAndroidPermissionsAsync(fixturesPath, permissionsToPersist)
      ).toBe(true);

      const manifest = await Manifest.readAndroidManifestAsync(appManifestPath);
      expect(Manifest.getPermissions(manifest)).toStrictEqual(
        permissionsToPersist.map(Manifest.ensurePermissionNameFormat)
      );
    });

    it(`returns false when the native project cannot be found`, async () => {
      expect(await Manifest.persistAndroidPermissionsAsync(fixturesPath, [])).toBe(false);
    });
  });
});
