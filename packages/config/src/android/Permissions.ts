import {
  Document,
  getProjectAndroidManifestPathAsync,
  readAsync,
  writeAndroidManifestAsync,
} from './Manifest';

const USES_PERMISSION = 'uses-permission';

export function removePermissions(doc: Document, permissionNames?: string[]) {
  const targetNames = permissionNames ? permissionNames.map(ensurePermissionNameFormat) : null;
  const permissions = doc.manifest[USES_PERMISSION] || [];
  let nextPermissions = [];
  for (let attribute of permissions) {
    if (targetNames) {
      const value = attribute['$']['android:name'] || attribute['$']['name'];
      if (!targetNames.includes(value)) {
        nextPermissions.push(attribute);
      }
    }
  }

  doc.manifest[USES_PERMISSION] = nextPermissions;
}

export function addPermission(doc: Document, permissionName: string): void {
  const usesPermissions: { [key: string]: any }[] = doc.manifest[USES_PERMISSION] || [];
  usesPermissions.push({
    $: { 'android:name': permissionName },
  });
  doc.manifest[USES_PERMISSION] = usesPermissions;
}

export function ensurePermissions(
  doc: Document,
  permissionNames: string[]
): { [permission: string]: boolean } {
  const permissions = getPermissions(doc);

  const results: { [permission: string]: boolean } = {};
  for (const permissionName of permissionNames) {
    const targetName = ensurePermissionNameFormat(permissionName);
    if (!permissions.includes(targetName)) {
      addPermission(doc, targetName);
      results[permissionName] = true;
    } else {
      results[permissionName] = false;
    }
  }
  return results;
}

export function ensurePermission(doc: Document, permissionName: string): boolean {
  const permissions = getPermissions(doc);
  const targetName = ensurePermissionNameFormat(permissionName);

  if (!permissions.includes(targetName)) {
    addPermission(doc, targetName);
    return true;
  }
  return false;
}

export function ensurePermissionNameFormat(permissionName: string): string {
  if (permissionName.includes('.')) {
    const com = permissionName.split('.');
    const name = com.pop() as string;
    return [...com, name.toUpperCase()].join('.');
  } else {
    // If shorthand form like `WRITE_CONTACTS` is provided, expand it to `android.permission.WRITE_CONTACTS`.
    return ensurePermissionNameFormat(`android.permission.${permissionName}`);
  }
}

export function getPermissionAttributes(doc: Document): Document[] {
  return doc.manifest[USES_PERMISSION] || [];
}

export function getPermissions(doc: Document): string[] {
  const usesPermissions: { [key: string]: any }[] = doc.manifest[USES_PERMISSION] || [];
  const permissions = usesPermissions.map(permissionObject => {
    return permissionObject['$']['android:name'] || permissionObject['$']['name'];
  });
  return permissions;
}

export async function persistAndroidPermissionsAsync(
  projectDir: string,
  permissions: string[]
): Promise<boolean> {
  const manifestPath = await getProjectAndroidManifestPathAsync(projectDir);
  // The Android Manifest takes priority over the app.json
  if (!manifestPath) {
    return false;
  }
  const manifest = await readAsync(manifestPath);
  removePermissions(manifest);
  const results = ensurePermissions(manifest, permissions);
  if (Object.values(results).reduce((prev, current) => prev && current, true) === false) {
    const failed = Object.keys(results).filter(key => !results[key]);
    throw new Error(
      `Failed to write the following permissions to the native AndroidManifest.xml: ${failed.join(
        ', '
      )}`
    );
  }

  await writeAndroidManifestAsync(manifestPath, manifest);
  return true;
}

// TODO(Bacon): link to resources about required permission prompts
export const UnimodulePermissions: { [key: string]: string } = {
  'android.permission.READ_INTERNAL_STORAGE': 'READ_INTERNAL_STORAGE',
  'android.permission.ACCESS_COARSE_LOCATION': 'ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION': 'ACCESS_FINE_LOCATION',
  'android.permission.CAMERA': 'CAMERA',
  'android.permission.MANAGE_DOCUMENTS': 'MANAGE_DOCUMENTS',
  'android.permission.READ_CONTACTS': 'READ_CONTACTS',
  'android.permission.READ_CALENDAR': 'READ_CALENDAR',
  'android.permission.WRITE_CALENDAR': 'WRITE_CALENDAR',
  'android.permission.READ_EXTERNAL_STORAGE': 'READ_EXTERNAL_STORAGE',
  'android.permission.READ_PHONE_STATE': 'READ_PHONE_STATE',
  'android.permission.RECORD_AUDIO': 'RECORD_AUDIO',
  'android.permission.USE_FINGERPRINT': 'USE_FINGERPRINT',
  'android.permission.VIBRATE': 'VIBRATE',
  'android.permission.WAKE_LOCK': 'WAKE_LOCK',
  'android.permission.WRITE_EXTERNAL_STORAGE': 'WRITE_EXTERNAL_STORAGE',
  'com.anddoes.launcher.permission.UPDATE_COUNT': 'com.anddoes.launcher.permission.UPDATE_COUNT',
  'com.android.launcher.permission.INSTALL_SHORTCUT':
    'com.android.launcher.permission.INSTALL_SHORTCUT',
  'com.google.android.c2dm.permission.RECEIVE': 'com.google.android.c2dm.permission.RECEIVE',
  'com.google.android.gms.permission.ACTIVITY_RECOGNITION':
    'com.google.android.gms.permission.ACTIVITY_RECOGNITION',
  'com.google.android.providers.gsf.permission.READ_GSERVICES':
    'com.google.android.providers.gsf.permission.READ_GSERVICES',
  'com.htc.launcher.permission.READ_SETTINGS': 'com.htc.launcher.permission.READ_SETTINGS',
  'com.htc.launcher.permission.UPDATE_SHORTCUT': 'com.htc.launcher.permission.UPDATE_SHORTCUT',
  'com.majeur.launcher.permission.UPDATE_BADGE': 'com.majeur.launcher.permission.UPDATE_BADGE',
  'com.sec.android.provider.badge.permission.READ':
    'com.sec.android.provider.badge.permission.READ',
  'com.sec.android.provider.badge.permission.WRITE':
    'com.sec.android.provider.badge.permission.WRITE',
  'com.sonyericsson.home.permission.BROADCAST_BADGE':
    'com.sonyericsson.home.permission.BROADCAST_BADGE',
};
