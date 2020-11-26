import { ExpoConfig } from '@expo/config-types';

import { createAndroidManifestPlugin } from '../plugins/android-plugins';
import * as WarningAggregator from '../utils/warnings';
import { AndroidManifest, ManifestActivity } from './Manifest';

export type IntentFilterProps = {
  actions: string[];
  categories: string[];
  schemes: string[];
};

export const withScheme = createAndroidManifestPlugin(setScheme, 'withScheme');

export function getScheme(config: { scheme?: string | string[] }): string[] {
  if (Array.isArray(config.scheme)) {
    const validate = (value: any): value is string => typeof value === 'string';

    return config.scheme.filter<string>(validate);
  } else if (typeof config.scheme === 'string') {
    return [config.scheme];
  }
  return [];
}

export function setScheme(
  config: Pick<ExpoConfig, 'scheme' | 'android'>,
  androidManifest: AndroidManifest
) {
  const scheme = [
    ...getScheme(config),
    // @ts-ignore: TODO: android.scheme is an unreleased -- harder to add to turtle v1.
    ...getScheme(config.android ?? {}),
  ];
  // Add the package name to the list of schemes for easier Google auth and parity with Turtle v1.
  if (config.android?.package) {
    scheme.push(config.android.package);
  }
  if (scheme.length === 0) {
    return androidManifest;
  }

  if (!ensureManifestHasValidIntentFilter(androidManifest)) {
    WarningAggregator.addWarningAndroid(
      'scheme',
      `Cannot add schemes because the provided manifest does not have a valid Activity with \`android:launchMode="singleTask"\`.\nThis guide can help you get setup properly https://expo.fyi/setup-android-uri-scheme`
    );
    return androidManifest;
  }

  // Get the current schemes and remove them.
  const currentSchemes = getSchemesFromManifest(androidManifest);
  for (const uri of currentSchemes) {
    androidManifest = removeScheme(uri, androidManifest);
  }

  // Now add all the new schemes.
  for (const uri of scheme) {
    androidManifest = appendScheme(uri, androidManifest);
  }

  return androidManifest;
}

function isValidRedirectIntentFilter({ actions, categories, schemes }: IntentFilterProps): boolean {
  return (
    actions.includes('android.intent.action.VIEW') &&
    !categories.includes('android.intent.category.LAUNCHER')
  );
}

function propertiesFromIntentFilter(intentFilter: any): IntentFilterProps {
  const actions = intentFilter?.action?.map((data: any) => data?.$?.['android:name']) ?? [];
  const categories = intentFilter?.category?.map((data: any) => data?.$?.['android:name']) ?? [];
  const schemes = intentFilter?.data?.map((data: any) => data?.$?.['android:scheme']) ?? [];
  return {
    schemes,
    actions,
    categories,
  };
}

function getSingleTaskIntentFilters(androidManifest: AndroidManifest): any[] {
  if (!Array.isArray(androidManifest.manifest.application)) return [];

  let outputSchemes: any[] = [];
  for (const application of androidManifest.manifest.application) {
    const { activity } = application;
    // @ts-ignore
    const activities = Array.isArray(activity) ? activity : [activity];
    const singleTaskActivities = (activities as ManifestActivity[]).filter(
      activity => activity?.$?.['android:launchMode'] === 'singleTask'
    );
    for (const activity of singleTaskActivities) {
      const intentFilters = activity['intent-filter'];
      outputSchemes = outputSchemes.concat(intentFilters);
    }
  }
  return outputSchemes;
}

export function getSchemesFromManifest(androidManifest: AndroidManifest): string[] {
  const outputSchemes: IntentFilterProps[] = [];

  const singleTaskIntentFilters = getSingleTaskIntentFilters(androidManifest);
  for (const intentFilter of singleTaskIntentFilters) {
    const properties = propertiesFromIntentFilter(intentFilter);
    if (isValidRedirectIntentFilter(properties)) {
      outputSchemes.push(properties);
    }
  }

  return outputSchemes.reduce<string[]>((prev, { schemes }) => [...prev, ...schemes], []);
}

export function ensureManifestHasValidIntentFilter(androidManifest: AndroidManifest): boolean {
  if (!Array.isArray(androidManifest.manifest.application)) {
    return false;
  }

  for (const application of androidManifest.manifest.application) {
    for (const activity of application.activity || []) {
      if (activity?.$?.['android:launchMode'] === 'singleTask') {
        for (const intentFilter of activity['intent-filter'] || []) {
          // Parse valid intent filters...
          const properties = propertiesFromIntentFilter(intentFilter);
          if (isValidRedirectIntentFilter(properties)) {
            return true;
          }
        }
        if (!activity['intent-filter']) {
          activity['intent-filter'] = [];
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

export function hasScheme(scheme: string, androidManifest: AndroidManifest): boolean {
  const schemes = getSchemesFromManifest(androidManifest);
  return schemes.includes(scheme);
}

export function appendScheme(scheme: string, androidManifest: AndroidManifest): AndroidManifest {
  if (!Array.isArray(androidManifest.manifest.application)) {
    return androidManifest;
  }

  for (const application of androidManifest.manifest.application) {
    for (const activity of application.activity || []) {
      if (activity?.$?.['android:launchMode'] === 'singleTask') {
        for (const intentFilter of activity['intent-filter'] || []) {
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
  return androidManifest;
}

export function removeScheme(scheme: string, androidManifest: AndroidManifest): AndroidManifest {
  if (!Array.isArray(androidManifest.manifest.application)) {
    return androidManifest;
  }

  for (const application of androidManifest.manifest.application) {
    for (const activity of application.activity || []) {
      if (activity?.$?.['android:launchMode'] === 'singleTask') {
        for (const intentFilter of activity['intent-filter'] || []) {
          // Parse valid intent filters...
          const properties = propertiesFromIntentFilter(intentFilter);
          if (isValidRedirectIntentFilter(properties)) {
            for (const dataKey in intentFilter?.data || []) {
              const data = intentFilter.data?.[dataKey];
              if (data?.$?.['android:scheme'] === scheme) {
                delete intentFilter.data?.[dataKey];
              }
            }
          }
        }
        break;
      }
    }
  }

  return androidManifest;
}
