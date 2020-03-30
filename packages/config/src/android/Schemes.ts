import { Builder } from 'xml2js';

import {
  Document,
  InputOptions,
  resolveInputOptionsAsync,
  resolveOutputOptionsAsync,
  writeAndroidManifestAsync,
} from './Manifest';

export type IntentFilterProps = {
  actions: string[];
  categories: string[];
  schemes: string[];
};

function isValidRedirectIntentFilter({ actions, categories, schemes }: IntentFilterProps): boolean {
  if (
    actions.includes('android.intent.action.VIEW') &&
    !categories.includes('android.intent.category.LAUNCHER')
    //  && categories.includes('android.intent.category.BROWSABLE')
  ) {
    return true;
  } else if (schemes.length > 0) {
    // console.log('Found schemes in an invalid intent-filter: ', schemes, categories, actions);
  }
  return false;
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

function getSingleTaskIntentFilters(doc: Document): any[] {
  const applications: { [key: string]: any }[] = doc.manifest['application'] || [];

  let outputSchemes: any[] = [];
  for (const application of applications) {
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

function getSingleTaskIntentFilterProps(doc: Document): IntentFilterProps[] {
  let outputSchemes: IntentFilterProps[] = [];

  const singleTaskIntentFilters = getSingleTaskIntentFilters(doc);
  for (const intentFilter of singleTaskIntentFilters) {
    const properties = propertiesFromIntentFilter(intentFilter);
    if (isValidRedirectIntentFilter(properties)) {
      outputSchemes.push(properties);
    }
  }
  return outputSchemes;
}

export async function getSchemesAsync(options: InputOptions): Promise<string[]> {
  const manifest = await resolveInputOptionsAsync(options);
  return getSingleTaskIntentFilterProps(manifest).reduce<string[]>(
    (prev, { schemes }) => [...prev, ...schemes],
    []
  );
}

export function ensureManifestHasValidIntentFilter(manifest: Document): boolean {
  for (let application of manifest.manifest['application']) {
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

export async function modifySchemesAsync(
  options: InputOptions,
  scheme: { uri: string },
  modification: { operation: 'add' | 'remove'; dryRun?: boolean }
): Promise<Document> {
  const manifest = await resolveInputOptionsAsync(options);
  const schemes = await getSchemesAsync({ manifest });
  const shouldAdd = modification.operation === 'add';
  if (shouldAdd && schemes.includes(scheme.uri)) {
    throw new Error(`URI scheme "${scheme.uri}" already exists in AndroidManifest.xml`);
  }
  if (!shouldAdd && !schemes.includes(scheme.uri)) {
    throw new Error(`URI scheme "${scheme.uri}" does not exist in the AndroidManifest.xml`);
  }

  if (!ensureManifestHasValidIntentFilter(manifest)) {
    throw new Error(
      `Cannot ${modification.operation} scheme "${scheme.uri}" because the provided manifest does not have a valid Activity with \`android:launchMode="singleTask"\``
    );
  }

  const applications: { [key: string]: any }[] = manifest.manifest['application'] || [];

  for (let application of applications) {
    for (let activity of application.activity) {
      if (activity?.['$']?.['android:launchMode'] === 'singleTask') {
        for (let intentFilter of activity['intent-filter']) {
          // Parse valid intent filters...
          // console.log('DATA: ', intentFilter);

          // if (Array.isArray(intentFilter?.data)) {
          const properties = propertiesFromIntentFilter(intentFilter);
          if (isValidRedirectIntentFilter(properties)) {
            if (shouldAdd) {
              if (!intentFilter.data) intentFilter.data = [];
              intentFilter.data.push({
                $: { 'android:scheme': scheme.uri },
              });
            } else {
              for (let dataKey in intentFilter?.data) {
                let data = intentFilter.data[dataKey];
                if (!shouldAdd) {
                  if (data?.['$']?.['android:scheme'] === scheme.uri) {
                    delete intentFilter.data[dataKey];
                    // delete data;
                  }
                }
              }
            }
          }
        }
        break;
      }
    }
  }

  if (modification.dryRun) {
    console.log('Write manifest:');
    const manifestXml = new Builder().buildObject(manifest);
    console.log(manifestXml);
    return manifest;
  }
  const outputPath = await resolveOutputOptionsAsync(options);
  await writeAndroidManifestAsync(outputPath, manifest);
  return manifest;
}
