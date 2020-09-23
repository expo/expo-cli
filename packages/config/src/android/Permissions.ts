import { ExpoConfig } from '../Config.types';
import { Document, ManifestUsesPermission } from './Manifest';

const USES_PERMISSION = 'uses-permission';

export const requiredPermissions = [
  'android.permission.INTERNET',
  'android.permission.ACCESS_NETWORK_STATE',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.WAKE_LOCK',
  'com.google.android.c2dm.permission.RECEIVE',
];
export const allPermissions = [
  ...requiredPermissions,
  'android.permission.ACCESS_WIFI_STATE',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.CAMERA',
  'android.permission.MANAGE_DOCUMENTS',
  'android.permission.READ_CONTACTS',
  'android.permission.WRITE_CONTACTS',
  'android.permission.READ_CALENDAR',
  'android.permission.WRITE_CALENDAR',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.READ_INTERNAL_STORAGE',
  'android.permission.READ_PHONE_STATE',
  'android.permission.RECORD_AUDIO',
  'android.permission.USE_FINGERPRINT',
  'android.permission.VIBRATE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.READ_SMS',
  'com.anddoes.launcher.permission.UPDATE_COUNT',
  'com.android.launcher.permission.INSTALL_SHORTCUT',
  'com.google.android.gms.permission.ACTIVITY_RECOGNITION',
  'com.google.android.providers.gsf.permission.READ_GSERVICES',
  'com.htc.launcher.permission.READ_SETTINGS',
  'com.htc.launcher.permission.UPDATE_SHORTCUT',
  'com.majeur.launcher.permission.UPDATE_BADGE',
  'com.sec.android.provider.badge.permission.READ',
  'com.sec.android.provider.badge.permission.WRITE',
  'com.sonyericsson.home.permission.BROADCAST_BADGE',
];

function prefixAndroidPermissionsIfNecessary(permissions: string[]): string[] {
  return permissions.map(permission => {
    if (!permission.includes('.')) {
      return `android.permission.${permission}`;
    }
    return permission;
  });
}

export function getAndroidPermissions(config: ExpoConfig): string[] {
  return config.android?.permissions ?? [];
}

export async function setAndroidPermissions(config: ExpoConfig, manifestDocument: Document) {
  const permissions = getAndroidPermissions(config);
  let permissionsToAdd = [];
  if (permissions === null) {
    // Use all Expo permissions
    permissionsToAdd = allPermissions;
  } else {
    // Use minimum required, plus any specified in permissions array
    const providedPermissions = prefixAndroidPermissionsIfNecessary(permissions);
    permissionsToAdd = [...providedPermissions, ...requiredPermissions];
  }

  let manifestPermissions: ManifestUsesPermission[] = [];
  if (!manifestDocument.manifest.hasOwnProperty('uses-permission')) {
    manifestDocument.manifest['uses-permission'] = [];
  }
  manifestPermissions = manifestDocument.manifest['uses-permission'] ?? [];

  permissionsToAdd.forEach(permission => {
    if (!isPermissionAlreadyRequested(permission, manifestPermissions)) {
      addPermissionToManifest(permission, manifestPermissions);
    }
  });

  return manifestDocument;
}

export function isPermissionAlreadyRequested(
  permission: string,
  manifestPermissions: ManifestUsesPermission[]
): boolean {
  const hasPermission = manifestPermissions.filter(
    (e: any) => e['$']['android:name'] === permission
  );
  return hasPermission.length > 0;
}

export function addPermissionToManifest(
  permission: string,
  manifestPermissions: ManifestUsesPermission[]
) {
  manifestPermissions.push({ $: { 'android:name': permission } });
  return manifestPermissions;
}

export function removePermissions(doc: Document, permissionNames?: string[]) {
  const targetNames = permissionNames ? permissionNames.map(ensurePermissionNameFormat) : null;
  const permissions = doc.manifest[USES_PERMISSION] || [];
  const nextPermissions = [];
  for (const attribute of permissions) {
    if (targetNames) {
      // @ts-ignore: name isn't part of the type
      const value = attribute['$']['android:name'] || attribute['$']['name'];
      if (!targetNames.includes(value)) {
        nextPermissions.push(attribute);
      }
    }
  }

  doc.manifest[USES_PERMISSION] = nextPermissions;
}

export function addPermission(doc: Document, permissionName: string): void {
  const usesPermissions: ManifestUsesPermission[] = doc.manifest[USES_PERMISSION] || [];
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

export function getPermissions(doc: Document): string[] {
  const usesPermissions: { [key: string]: any }[] = doc.manifest[USES_PERMISSION] || [];
  const permissions = usesPermissions.map(permissionObject => {
    return permissionObject['$']['android:name'] || permissionObject['$']['name'];
  });
  return permissions;
}
