import { Android, AndroidIntentFiltersData, ExpoConfig } from '@expo/config-types';
import { Parser } from 'xml2js';

import { createAndroidManifestPlugin } from '../plugins/android-plugins';
import { AndroidManifest, getMainActivityOrThrow } from './Manifest';

type AndroidIntentFilters = NonNullable<Android['intentFilters']>;
// TODO: make it so intent filters aren't written again if you run the command again

export const withAndroidIntentFilters = createAndroidManifestPlugin(
  setAndroidIntentFilters,
  'withAndroidIntentFilters'
);

export function getIntentFilters(config: Pick<ExpoConfig, 'android'>): AndroidIntentFilters {
  return config.android?.intentFilters ?? [];
}

export async function setAndroidIntentFilters(
  config: Pick<ExpoConfig, 'android'>,
  androidManifest: AndroidManifest
): Promise<AndroidManifest> {
  const intentFilters = getIntentFilters(config);
  if (!intentFilters.length) {
    return androidManifest;
  }

  const intentFiltersXML = renderIntentFilters(intentFilters).join('');
  const parser = new Parser();
  const intentFiltersJSON = await parser.parseStringPromise(intentFiltersXML);

  const mainActivity = getMainActivityOrThrow(androidManifest);

  mainActivity['intent-filter'] = mainActivity['intent-filter']?.concat(
    intentFiltersJSON['intent-filter']
  );

  return androidManifest;
}

export default function renderIntentFilters(intentFilters: AndroidIntentFilters): string[] {
  // returns an array of <intent-filter> tags:
  // [
  //   `<intent-filter>
  //     <data android:scheme="exp"/>
  //     <data android:scheme="exps"/>
  //
  //     <action android:name="android.intent.action.VIEW"/>
  //
  //     <category android:name="android.intent.category.DEFAULT"/>
  //     <category android:name="android.intent.category.BROWSABLE"/>
  //   </intent-filter>`,
  //   ...
  // ]
  return intentFilters.map(intentFilter => {
    const autoVerify = intentFilter.autoVerify ? ' android:autoVerify="true"' : '';

    return `<intent-filter${autoVerify}>
      ${renderIntentFilterData(intentFilter.data)}
      <action android:name="android.intent.action.${intentFilter.action}"/>
      ${renderIntentFilterCategory(intentFilter.category)}
    </intent-filter>`;
  });
}

function renderIntentFilterDatumEntries(datum: AndroidIntentFiltersData = {}): string {
  const entries: string[] = [];
  for (const [key, value] of Object.entries(datum)) {
    entries.push(`android:${key}="${value}"`);
  }
  return entries.join(' ');
}

function renderIntentFilterData(
  data?: AndroidIntentFiltersData | AndroidIntentFiltersData[]
): string {
  return (Array.isArray(data) ? data : [data])
    .filter(Boolean)
    .map(datum => `<data ${renderIntentFilterDatumEntries(datum)}/>`)
    .join('\n');
}

function renderIntentFilterCategory(category?: string | string[]): string {
  return (Array.isArray(category) ? category : [category])
    .filter(Boolean)
    .map(cat => `<category android:name="android.intent.category.${cat}"/>`)
    .join('\n');
}
