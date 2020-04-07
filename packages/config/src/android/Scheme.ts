import { Parser } from 'xml2js';
import { ExpoConfig } from '../Config.types';
import { Document } from './Manifest';

export type IntentFilterProps = {
  actions: string[];
  categories: string[];
  schemes: string[];
};

export function getScheme(config: ExpoConfig) {
  return typeof config.scheme === 'string' ? config.scheme : null;
}

export async function setScheme(config: ExpoConfig, manifestDocument: Document) {
  let scheme = getScheme(config);
  if (!scheme) {
    return false;
  }

  let mainActivity = manifestDocument.manifest.application[0].activity.filter(
    (e: any) => e['$']['android:name'] === '.MainActivity'
  );

  const schemeTag = `<data android:scheme="${scheme}"/>`;
  const intentFiltersXML = `
  <intent-filter>
    <action android:name="android.intent.action.VIEW"/>
    <category android:name="android.intent.category.DEFAULT"/>
    <category android:name="android.intent.category.BROWSABLE"/>
    ${schemeTag}
  </intent-filter>`;
  const parser = new Parser();
  const intentFiltersJSON = await parser.parseStringPromise(intentFiltersXML);

  if ('intent-filter' in mainActivity[0]) {
    mainActivity[0]['intent-filter'] = mainActivity[0]['intent-filter'].concat(
      intentFiltersJSON['intent-filter']
    );
  } else {
    mainActivity[0]['intent-filter'] = intentFiltersJSON['intent-filter'];
  }

  return manifestDocument;
}

function isValidRedirectIntentFilter({ actions, categories, schemes }: IntentFilterProps): boolean {
  return (
    actions.includes('android.intent.action.VIEW') &&
    !categories.includes('android.intent.category.LAUNCHER')
  );
}

function propertiesFromIntentFilter(intentFilter: any): IntentFilterProps {
  const actions = intentFilter?.action?.map((data: any) => data?.['$']?.['android:name']) ?? [];
  const categories =
    intentFilter?.category?.map((data: any) => data?.['$']?.['android:name']) ?? [];
  const schemes = intentFilter?.data?.map((data: any) => data?.['$']?.['android:scheme']) ?? [];
  return {
    schemes,
    actions,
    categories,
  };
}

function getSingleTaskIntentFilters(manifest: Document): any[] {
  if (!Array.isArray(manifest.manifest.application)) return [];

  let outputSchemes: any[] = [];
  for (let application of manifest.manifest.application) {
    const { activity } = application;
    let activities = Array.isArray(activity) ? activity : [activity];
    const singleTaskActivities = activities.filter(
      activity => activity?.['$']?.['android:launchMode'] === 'singleTask'
    );
    for (const activity of singleTaskActivities) {
      const intentFilters = activity['intent-filter'];
      outputSchemes.push(...intentFilters);
    }
  }
  return outputSchemes;
}

function getSingleTaskIntentFilterProps(manifest: Document): IntentFilterProps[] {
  let outputSchemes: IntentFilterProps[] = [];

  const singleTaskIntentFilters = getSingleTaskIntentFilters(manifest);
  for (const intentFilter of singleTaskIntentFilters) {
    const properties = propertiesFromIntentFilter(intentFilter);
    if (isValidRedirectIntentFilter(properties)) {
      outputSchemes.push(properties);
    }
  }
  return outputSchemes;
}

export function getSchemesFromManifest(manifestDocument: Document): string[] {
  return getSingleTaskIntentFilterProps(manifestDocument).reduce<string[]>(
    (prev, { schemes }) => [...prev, ...schemes],
    []
  );
}

export function ensureManifestHasValidIntentFilter(manifest: Document): boolean {
  if (!Array.isArray(manifest.manifest.application)) return false;

  for (let application of manifest.manifest.application) {
    for (let activity of application.activity) {
      if (activity?.['$']?.['android:launchMode'] === 'singleTask') {
        for (let intentFilter of activity['intent-filter']) {
          // Parse valid intent filters...
          const properties = propertiesFromIntentFilter(intentFilter);
          if (isValidRedirectIntentFilter(properties)) {
            return true;
          }
        }
        activity['intent-filter'].push({
          action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
          category: [
            { $: { 'android:name': 'android.intent.category.DEFAULT' } },
            { $: { 'android:name': 'android.intent.category.BROWSABLE' } },
          ],
        });
        return true;
      }
    }
  }
  return false;
}

export function hasScheme(scheme: string, manifest: Document): boolean {
  const schemes = getSchemesFromManifest(manifest);
  return schemes.includes(scheme);
}

export function appendScheme(scheme: string, manifest: Document): Document {
  if (!Array.isArray(manifest.manifest.application)) return manifest;

  for (let application of manifest.manifest.application) {
    for (let activity of application.activity) {
      if (activity?.['$']?.['android:launchMode'] === 'singleTask') {
        for (let intentFilter of activity['intent-filter']) {
          const properties = propertiesFromIntentFilter(intentFilter);
          if (isValidRedirectIntentFilter(properties)) {
            if (!intentFilter.data) intentFilter.data = [];
            intentFilter.data.push({
              $: { 'android:scheme': scheme },
            });
          }
        }
        break;
      }
    }
  }
  return manifest;
}

export function removeScheme(scheme: string, manifest: Document): Document {
  if (!Array.isArray(manifest.manifest.application)) return manifest;

  for (let application of manifest.manifest.application) {
    for (let activity of application.activity) {
      if (activity?.['$']?.['android:launchMode'] === 'singleTask') {
        for (let intentFilter of activity['intent-filter']) {
          // Parse valid intent filters...
          const properties = propertiesFromIntentFilter(intentFilter);
          if (isValidRedirectIntentFilter(properties)) {
            for (let dataKey in intentFilter?.data) {
              let data = intentFilter.data[dataKey];
              if (data?.['$']?.['android:scheme'] === scheme) {
                delete intentFilter.data[dataKey];
              }
            }
          }
        }
        break;
      }
    }
  }

  return manifest;
}
