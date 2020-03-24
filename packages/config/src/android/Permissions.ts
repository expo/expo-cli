import { ExpoConfig } from '../Config.types';
import {
  getProjectAndroidManifestPathAsync,
  readAndroidManifestAsync,
  writeAndroidManifestAsync,
} from './Manifest';

type XMLPermission = { $: { 'android:name': string } };

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

export async function setAndroidPermissions(config: ExpoConfig, projectDirectory: string) {
  const manifestPath = await getProjectAndroidManifestPathAsync(projectDirectory);
  if (!manifestPath) {
    return false;
  }

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

  let androidManifestJson = await readAndroidManifestAsync(manifestPath);
  let manifestPermissions: XMLPermission[] = [];
  if (!androidManifestJson.manifest.hasOwnProperty('uses-permission')) {
    androidManifestJson.manifest['uses-permission'] = [];
  }
  manifestPermissions = androidManifestJson.manifest['uses-permission'];

  permissionsToAdd.forEach(permission => {
    if (!isPermissionAlreadyRequested(permission, manifestPermissions)) {
      addPermissionToManifest(permission, manifestPermissions);
    }
  });

  try {
    await writeAndroidManifestAsync(manifestPath, androidManifestJson);
  } catch (e) {
    throw new Error(
      `Error setting Android permissions. Cannot write new AndroidManifest.xml to ${manifestPath}.`
    );
  }
  return true;
}

export function isPermissionAlreadyRequested(
  permission: string,
  manifestPermissions: XMLPermission[]
): boolean {
  const hasPermission = manifestPermissions.filter(
    (e: any) => e['$']['android:name'] === permission
  );
  return hasPermission.length > 0;
}

export function addPermissionToManifest(permission: string, manifestPermissions: XMLPermission[]) {
  manifestPermissions.push({ $: { 'android:name': permission } });
  return manifestPermissions;
}
