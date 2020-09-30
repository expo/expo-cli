import fs from 'fs-extra';
import path from 'path';

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

type ManifestApplication = {
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

export type Document = {
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
  manifest?: Document | null;
};

export async function writeAndroidManifestAsync(
  manifestPath: string,
  manifest: Document
): Promise<void> {
  const manifestXml = XML.format(manifest);
  await fs.ensureDir(path.dirname(manifestPath));
  await fs.writeFile(manifestPath, manifestXml);
}

export async function readAndroidManifestAsync(manifestPath: string): Promise<Document> {
  const xml = await XML.readXMLAsync({ path: manifestPath });
  if (!isManifest(xml)) {
    throw new Error('Invalid manifest found at: ' + manifestPath);
  }
  return xml;
}

function isManifest(xml: XML.XMLObject): xml is Document {
  // TODO: Maybe more validation
  return !!xml.manifest;
}

export function getMainApplication(manifest: Document): ManifestApplication | null {
  return (
    manifest?.manifest?.application?.filter(
      e => e?.['$']?.['android:name'] === '.MainApplication'
    )[0] ?? null
  );
}

export function getMainActivity(manifest: Document): ManifestActivity | null {
  const mainActivity = manifest?.manifest?.application?.[0]?.activity?.filter?.(
    (e: any) => e['$']['android:name'] === '.MainActivity'
  );
  return mainActivity?.[0] ?? null;
}

export function addMetaDataItemToMainApplication(
  mainApplication: any,
  itemName: string,
  itemValue: string
): ManifestApplication {
  let existingMetaDataItem;
  const newItem = {
    $: {
      'android:name': itemName,
      'android:value': itemValue,
    },
  };
  if (mainApplication.hasOwnProperty('meta-data')) {
    existingMetaDataItem = mainApplication['meta-data'].filter(
      (e: any) => e['$']['android:name'] === itemName
    );
    if (existingMetaDataItem.length) {
      existingMetaDataItem[0]['$']['android:value'] = itemValue;
    } else {
      mainApplication['meta-data'].push(newItem);
    }
  } else {
    mainApplication['meta-data'] = [newItem];
  }
  return mainApplication;
}

export function removeMetaDataItemFromMainApplication(mainApplication: any, itemName: string) {
  if (mainApplication.hasOwnProperty('meta-data')) {
    const index = mainApplication['meta-data'].findIndex(
      (e: any) => e['$']['android:name'] === itemName
    );

    if (index > -1) {
      mainApplication['meta-data'].splice(index, 1);
    }
  }
  return mainApplication;
}
