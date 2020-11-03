import fs from 'fs-extra';
import path from 'path';

import { assert } from '../Errors';
import * as XML from './XML';

export type StringBoolean = 'true' | 'false';

type ManifestMetaDataAttributes = AndroidManifestAttributes & {
  'android:value'?: string;
  'android:resource'?: string;
};

type AndroidManifestAttributes = {
  'android:name': string | 'android.intent.action.VIEW';
};

type ManifestAction = {
  $: AndroidManifestAttributes;
};

type ManifestCategory = {
  $: AndroidManifestAttributes;
};

type ManifestData = {
  $: {
    [key: string]: string | undefined;
    'android:host'?: string;
    'android:pathPrefix'?: string;
    'android:scheme'?: string;
  };
};

type ManifestReciever = {
  $: AndroidManifestAttributes & {
    'android:exported'?: StringBoolean;
    'android:enabled'?: StringBoolean;
  };
  'intent-filter'?: ManifestIntentFilter[];
};

type ManifestIntentFilter = {
  action?: ManifestAction[];
  data?: ManifestData[];
  category?: ManifestCategory[];
};

export type ManifestMetaData = {
  $: ManifestMetaDataAttributes;
};

type ManifestServiceAttributes = AndroidManifestAttributes & {
  'android:enabled'?: StringBoolean;
  'android:exported'?: StringBoolean;
  'android:permission'?: string;
  // ...
};

type ManifestService = {
  $: ManifestServiceAttributes;
  'intent-filter'?: ManifestIntentFilter[];
};

type ManifestApplicationAttributes = {
  'android:name': string | '.MainApplication';
  'android:icon'?: string;
  'android:label'?: string;
  'android:allowBackup'?: StringBoolean;
  'android:largeHeap'?: StringBoolean;
  'android:requestLegacyExternalStorage'?: StringBoolean;
  'android:usesCleartextTraffic'?: StringBoolean;
  [key: string]: string | undefined;
};

export type ManifestActivity = {
  $: ManifestApplicationAttributes & {
    'android:exported'?: StringBoolean;
    'android:launchMode'?: string;
    'android:theme'?: string;
    [key: string]: string | undefined;
  };
  'intent-filter'?: ManifestIntentFilter[];
  // ...
};

export type ManifestUsesLibrary = {
  $: AndroidManifestAttributes & {
    'android:required'?: StringBoolean;
  };
};

export type ManifestApplication = {
  $: ManifestApplicationAttributes;
  activity?: ManifestActivity[];
  service?: ManifestService[];
  receiver?: ManifestReciever[];
  'meta-data'?: ManifestMetaData[];
  'uses-library'?: ManifestUsesLibrary[];
  // ...
};

type ManifestPermission = {
  $: AndroidManifestAttributes & {
    'android:protectionLevel'?: string | 'signature';
  };
};

export type ManifestUsesPermission = {
  $: AndroidManifestAttributes;
};

type ManifestUsesFeature = {
  $: AndroidManifestAttributes & {
    'android:glEsVersion'?: string;
    'android:required': StringBoolean;
  };
};

export type AndroidManifest = {
  manifest: {
    // Probably more, but this is currently all we'd need for most cases in Expo.
    $: { 'xmlns:android': string; package?: string; [key: string]: string | undefined };
    permission?: ManifestPermission[];
    'uses-permission'?: ManifestUsesPermission[];
    'uses-feature'?: ManifestUsesFeature[];
    application?: ManifestApplication[];
  };
};

export type InputOptions = {
  manifestPath?: string | null;
  projectRoot?: string | null;
  manifest?: AndroidManifest | null;
};

export async function writeAndroidManifestAsync(
  manifestPath: string,
  manifest: AndroidManifest
): Promise<void> {
  const manifestXml = XML.format(manifest);
  await fs.ensureDir(path.dirname(manifestPath));
  await fs.writeFile(manifestPath, manifestXml);
}

export async function readAndroidManifestAsync(manifestPath: string): Promise<AndroidManifest> {
  const xml = await XML.readXMLAsync({ path: manifestPath });
  if (!isManifest(xml)) {
    throw new Error('Invalid manifest found at: ' + manifestPath);
  }
  return xml;
}

function isManifest(xml: XML.XMLObject): xml is AndroidManifest {
  // TODO: Maybe more validation
  return !!xml.manifest;
}

export function getMainApplication(manifest: AndroidManifest): ManifestApplication | null {
  return (
    manifest?.manifest?.application?.filter(
      e => e?.$?.['android:name'] === '.MainApplication'
    )[0] ?? null
  );
}

export function getMainApplicationOrThrow(manifest: AndroidManifest): ManifestApplication {
  const mainApplication = getMainApplication(manifest);
  assert(mainApplication, 'AndroidManifest.xml is missing the required MainApplication element');
  return mainApplication;
}

export function getMainActivity(manifest: AndroidManifest): ManifestActivity | null {
  const mainActivity = manifest?.manifest?.application?.[0]?.activity?.filter?.(
    (e: any) => e.$['android:name'] === '.MainActivity'
  );
  return mainActivity?.[0] ?? null;
}

export function addMetaDataItemToMainApplication(
  mainApplication: ManifestApplication,
  itemName: string,
  itemValue: string
): ManifestApplication {
  let existingMetaDataItem;
  const newItem = {
    $: prefixAndroidKeys({ name: itemName, value: itemValue }),
  } as ManifestMetaData;
  if (mainApplication['meta-data']) {
    existingMetaDataItem = mainApplication['meta-data'].filter(
      (e: any) => e.$['android:name'] === itemName
    );
    if (existingMetaDataItem.length) {
      existingMetaDataItem[0].$['android:value'] = itemValue;
    } else {
      mainApplication['meta-data'].push(newItem);
    }
  } else {
    mainApplication['meta-data'] = [newItem];
  }
  return mainApplication;
}

export function removeMetaDataItemFromMainApplication(mainApplication: any, itemName: string) {
  const index = findMetaDataItem(mainApplication, itemName);
  if (mainApplication?.['meta-data'] && index > -1) {
    mainApplication['meta-data'].splice(index, 1);
  }
  return mainApplication;
}

function findApplicationSubItem(
  mainApplication: ManifestApplication,
  category: keyof ManifestApplication,
  itemName: string
): number {
  const parent = mainApplication[category];
  if (Array.isArray(parent)) {
    const index = parent.findIndex((e: any) => e.$['android:name'] === itemName);

    return index;
  }
  return -1;
}

export function findMetaDataItem(mainApplication: any, itemName: string): number {
  return findApplicationSubItem(mainApplication, 'meta-data', itemName);
}

export function findUsesLibraryItem(mainApplication: any, itemName: string): number {
  return findApplicationSubItem(mainApplication, 'uses-library', itemName);
}

export function getMainApplicationMetaDataValue(
  androidManifest: AndroidManifest,
  name: string
): string | null {
  const mainApplication = getMainApplication(androidManifest);

  if (mainApplication?.hasOwnProperty('meta-data')) {
    const item = mainApplication?.['meta-data']?.find((e: any) => e.$['android:name'] === name);
    return item?.$['android:value'] ?? null;
  }

  return null;
}

export function addUsesLibraryItemToMainApplication(
  mainApplication: ManifestApplication,
  item: { name: string; required?: boolean }
): ManifestApplication {
  let existingMetaDataItem;
  const newItem = {
    $: prefixAndroidKeys(item),
  } as ManifestUsesLibrary;

  if (mainApplication['uses-library']) {
    existingMetaDataItem = mainApplication['uses-library'].filter(
      e => e.$['android:name'] === item.name
    );
    if (existingMetaDataItem.length) {
      existingMetaDataItem[0].$ = newItem.$;
    } else {
      mainApplication['uses-library'].push(newItem);
    }
  } else {
    mainApplication['uses-library'] = [newItem];
  }
  return mainApplication;
}

export function removeUsesLibraryItemFromMainApplication(
  mainApplication: ManifestApplication,
  itemName: string
) {
  const index = findUsesLibraryItem(mainApplication, itemName);
  if (mainApplication?.['uses-library'] && index > -1) {
    mainApplication['uses-library'].splice(index, 1);
  }
  return mainApplication;
}

export function prefixAndroidKeys<T extends Record<string, any> = Record<string, string>>(
  head: T
): Record<string, any> {
  // prefix all keys with `android:`
  return Object.entries(head).reduce(
    (prev, [key, curr]) => ({ ...prev, [`android:${key}`]: curr }),
    {} as T
  );
}
