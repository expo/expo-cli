import { resolve } from 'path';
import * as Manifest from '../Manifest';

const fixturesPath = resolve(__dirname, 'fixtures');
const manifestPath = resolve(fixturesPath, 'react-native-AndroidManifest.xml');

describe('Permissions', () => {
  it(`adds a new permission`, async () => {
    const manifest = await Manifest.readAsync(manifestPath);
    const didAdd = Manifest.ensurePermission(manifest, 'EXPO_TEST_PERMISSION');
    const permissions = Manifest.getPermissions(manifest);
    expect(didAdd).toBe(true);
    expect(permissions).toContain('android.permission.EXPO_TEST_PERMISSION');
    expect(permissions.length).toBe(2);
  });

  it(`prevents adding a duplicate permission`, async () => {
    const manifest = await Manifest.readAsync(manifestPath);
    const didAdd = Manifest.ensurePermission(manifest, 'INTERNET');
    const permissions = Manifest.getPermissions(manifest);
    expect(didAdd).toBe(false);
    expect(permissions).toContain('android.permission.INTERNET');
    expect(permissions.length).toBe(1);
  });

  it(`removes permissions by name`, async () => {
    const manifest = await Manifest.readAsync(manifestPath);
    expect(Manifest.ensurePermission(manifest, 'VALUE_TO_REMOVE_1')).toBe(true);
    expect(Manifest.ensurePermission(manifest, 'VALUE_TO_REMOVE_2')).toBe(true);
    expect(Manifest.getPermissions(manifest).length).toBe(3);

    Manifest.removePermissions(manifest, ['VALUE_TO_REMOVE_1', 'VALUE_TO_REMOVE_2']);
    Manifest.logManifest(manifest);
    expect(Manifest.getPermissions(manifest).length).toBe(1);
  });

  it(`can write with a pretty format`, async () => {
    const manifest = await Manifest.readAsync(manifestPath);
    expect(Manifest.ensurePermission(manifest, 'NEW_PERMISSION_1')).toBe(true);
    expect(Manifest.ensurePermission(manifest, 'NEW_PERMISSION_2')).toBe(true);
    expect(Manifest.getPermissions(manifest).length).toBe(3);

    expect(
      Manifest.getRoot(manifest).toString({
        declaration: false,
        whitespace: true,
        selfCloseEmpty: true,
      })
    ).toMatchSnapshot();
  });
});
