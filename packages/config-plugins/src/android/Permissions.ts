import { ExpoConfig } from '@expo/config-types';

import { ConfigPlugin } from '../Plugin.types';
import { withAndroidManifest } from '../plugins/android-plugins';
import { AndroidManifest, ManifestUsesPermission } from './Manifest';

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

export const withPermissions: ConfigPlugin<string[] | void> = (config, permissions) => {
  if (Array.isArray(permissions)) {
    permissions = permissions.filter(Boolean);
    if (!config.android) config.android = {};
    if (!config.android.permissions) config.android.permissions = [];
    config.android.permissions = [
      // @ts-ignore
      ...new Set(config.android.permissions.concat(permissions)),
    ];
  }
  return withAndroidManifest(config, async config => {
    config.modResults = await setAndroidPermissions(config, config.modResults);
    return config;
  });
};

function prefixAndroidPermissionsIfNecessary(permissions: string[]): string[] {
  return permissions.map(permission => {
    if (!permission.includes('.')) {
      return `android.permission.${permission}`;
    }
    return permission;
  });
}

export function getAndroidPermissions(config: Pick<ExpoConfig, 'android'>): string[] {
  return config.android?.permissions ?? [];
}

export function setAndroidPermissions(
  config: Pick<ExpoConfig, 'android'>,
  androidManifest: AndroidManifest
) {
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

  if (!androidManifest.manifest.hasOwnProperty('uses-permission')) {
    androidManifest.manifest['uses-permission'] = [];
  }
  // manifest.manifest['uses-permission'] = [];

  const manifestPermissions = androidManifest.manifest['uses-permission'] ?? [];

  permissionsToAdd.forEach(permission => {
    if (!isPermissionAlreadyRequested(permission, manifestPermissions)) {
      addPermissionToManifest(permission, manifestPermissions);
    }
  });

  return androidManifest;
}

export function isPermissionAlreadyRequested(
  permission: string,
  manifestPermissions: ManifestUsesPermission[]
): boolean {
  return manifestPermissions.some(e => e.$['android:name'] === permission);
}

export function addPermissionToManifest(
  permission: string,
  manifestPermissions: ManifestUsesPermission[]
) {
  manifestPermissions.push({ $: { 'android:name': permission } });
  return manifestPermissions;
}

export function removePermissions(androidManifest: AndroidManifest, permissionNames?: string[]) {
  const targetNames = permissionNames ? permissionNames.map(ensurePermissionNameFormat) : null;
  const permissions = androidManifest.manifest[USES_PERMISSION] || [];
  const nextPermissions = [];
  for (const attribute of permissions) {
    if (targetNames) {
      // @ts-ignore: name isn't part of the type
      const value = attribute.$['android:name'] || attribute.$.name;
      if (!targetNames.includes(value)) {
        nextPermissions.push(attribute);
      }
    }
  }

  androidManifest.manifest[USES_PERMISSION] = nextPermissions;
}

export function addPermission(androidManifest: AndroidManifest, permissionName: string): void {
  const usesPermissions: ManifestUsesPermission[] = androidManifest.manifest[USES_PERMISSION] || [];
  usesPermissions.push({
    $: { 'android:name': permissionName },
  });
  androidManifest.manifest[USES_PERMISSION] = usesPermissions;
}

export function ensurePermissions(
  androidManifest: AndroidManifest,
  permissionNames: string[]
): { [permission: string]: boolean } {
  const permissions = getPermissions(androidManifest);

  const results: { [permission: string]: boolean } = {};
  for (const permissionName of permissionNames) {
    const targetName = ensurePermissionNameFormat(permissionName);
    if (!permissions.includes(targetName)) {
      addPermission(androidManifest, targetName);
      results[permissionName] = true;
    } else {
      results[permissionName] = false;
    }
  }
  return results;
}

export function ensurePermission(
  androidManifest: AndroidManifest,
  permissionName: string
): boolean {
  const permissions = getPermissions(androidManifest);
  const targetName = ensurePermissionNameFormat(permissionName);

  if (!permissions.includes(targetName)) {
    addPermission(androidManifest, targetName);
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

export function getPermissions(androidManifest: AndroidManifest): string[] {
  const usesPermissions: { [key: string]: any }[] = androidManifest.manifest[USES_PERMISSION] || [];
  const permissions = usesPermissions.map(permissionObject => {
    return permissionObject.$['android:name'] || permissionObject.$.name;
  });
  return permissions;
}
