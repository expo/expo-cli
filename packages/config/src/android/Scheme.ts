import { Parser } from 'xml2js';
import { ExpoConfig } from '../Config.types';
import { Document } from './Manifest';

export type IntentFilterProps = {
  actions: string[];
  categories: string[];
  schemes: string[];
};

export function getScheme(config: { scheme?: string | string[] }): string[] {
  if (Array.isArray(config.scheme)) {
    function validate(value: any): value is string {
      return typeof value === 'string';
    }
    return config.scheme.filter<string>(validate);
  } else if (typeof config.scheme === 'string') {
    return [config.scheme];
  }
  return [];
}

export async function setScheme(
  config: Pick<ExpoConfig, 'scheme' | 'android'>,
  manifestDocument: Document
) {
  let scheme = [...getScheme(config), ...getScheme(config.android ?? {})];
  if (scheme.length === 0) {
    return manifestDocument;
  }

  let mainActivity = manifestDocument.manifest.application[0].activity.filter(
    (e: any) => e['$']['android:name'] === '.MainActivity'
  );

  const intentFiltersXML = `
  <intent-filter>
    <action android:name="android.intent.action.VIEW"/>
    <category android:name="android.intent.category.DEFAULT"/>
    <category android:name="android.intent.category.BROWSABLE"/>
    ${scheme.map(scheme => `<data android:scheme="${scheme}"/>`).join('\n')}
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

function getSingleTaskIntentFilters(manifestDocument: Document): any[] {
  if (!Array.isArray(manifestDocument.manifest.application)) return [];

  let outputSchemes: any[] = [];
  for (let application of manifestDocument.manifest.application) {
    const { activity } = application;
    let activities = Array.isArray(activity) ? activity : [activity];
    const singleTaskActivities = activities.filter(
      activity => activity?.['$']?.['android:launchMode'] === 'singleTask'
    );
    for (const activity of singleTaskActivities) {
      const intentFilters = activity['intent-filter'];
      outputSchemes = outputSchemes.concat(intentFilters);
    }
  }
  return outputSchemes;
}

export function getSchemesFromManifest(manifestDocument: Document): string[] {
  let outputSchemes: IntentFilterProps[] = [];

  const singleTaskIntentFilters = getSingleTaskIntentFilters(manifestDocument);
  for (const intentFilter of singleTaskIntentFilters) {
    const properties = propertiesFromIntentFilter(intentFilter);
    if (isValidRedirectIntentFilter(properties)) {
      outputSchemes.push(properties);
    }
  }

  return outputSchemes.reduce<string[]>((prev, { schemes }) => [...prev, ...schemes], []);
}

export function ensureManifestHasValidIntentFilter(manifestDocument: Document): boolean {
  if (!Array.isArray(manifestDocument.manifest.application)) return false;

  for (let application of manifestDocument.manifest.application) {
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

export function hasScheme(scheme: string, manifestDocument: Document): boolean {
  const schemes = getSchemesFromManifest(manifestDocument);
  return schemes.includes(scheme);
}

export function appendScheme(scheme: string, manifestDocument: Document): Document {
  if (!Array.isArray(manifestDocument.manifest.application)) return manifestDocument;

  for (let application of manifestDocument.manifest.application) {
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
  return manifestDocument;
}

export function removeScheme(scheme: string, manifestDocument: Document): Document {
  if (!Array.isArray(manifestDocument.manifest.application)) return manifestDocument;

  for (let application of manifestDocument.manifest.application) {
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

  return manifestDocument;
}
