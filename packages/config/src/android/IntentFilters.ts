import _ from 'lodash';
import { Parser } from 'xml2js';

import { ExpoConfig } from '../Config.types';
import { Document } from './Manifest';

// TODO: make it so intent filters aren't written again if you run the command again

export function getIntentFilters(config: ExpoConfig) {
  return config.android?.intentFilters ?? [];
}

export async function setAndroidIntentFilters(config: ExpoConfig, manifestDocument: Document) {
  const intentFilters = getIntentFilters(config);
  if (!intentFilters.length) {
    return manifestDocument;
  }

  let intentFiltersXML = renderIntentFilters(intentFilters).join('');
  const parser = new Parser();
  const intentFiltersJSON = await parser.parseStringPromise(intentFiltersXML);

  let mainActivity = manifestDocument.manifest.application[0].activity.filter(
    (e: any) => e['$']['android:name'] === '.MainActivity'
  );

  mainActivity[0]['intent-filter'] = mainActivity[0]['intent-filter'].concat(
    intentFiltersJSON['intent-filter']
  );

  return manifestDocument;
}

export default function renderIntentFilters(intentFilters: any) {
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
  return intentFilters.map((intentFilter: any) => {
    const autoVerify = intentFilter.autoVerify ? ' android:autoVerify="true"' : '';

    return `<intent-filter${autoVerify}>
      ${renderIntentFilterData(intentFilter.data)}
      <action android:name="android.intent.action.${intentFilter.action}"/>
      ${renderIntentFilterCategory(intentFilter.category)}
    </intent-filter>`;
  });
}

function renderIntentFilterDatumEntries(datum: any) {
  return _.toPairs(datum)
    .map(entry => `android:${entry[0]}="${entry[1]}"`)
    .join(' ');
}

function renderIntentFilterData(data: any) {
  return (Array.isArray(data) ? data : [data])
    .map(datum => `<data ${renderIntentFilterDatumEntries(datum)}/>`)
    .join('\n');
}

function renderIntentFilterCategory(category: any) {
  return (Array.isArray(category) ? category : [category])
    .map(cat => `<category android:name="android.intent.category.${cat}"/>`)
    .join('\n');
}
