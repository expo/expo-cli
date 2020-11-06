import JsonFile from '@expo/json-file';
import { join } from 'path';

import { ExpoConfig } from '../Config.types';
import { addWarningAndroid } from '../WarningAggregator';
import { buildResourceItem, readResourcesXMLAsync } from './Resources';
import { getProjectStringsXMLPathAsync, setStringItem } from './Strings';
import { writeXMLAsync } from './XML';

type LocaleJson = Record<string, string>;
type ResolvedLocalesJson = Record<string, LocaleJson>;
type ExpoConfigLocales = NonNullable<ExpoConfig['android']>['locales'];

export function getLocales(config: ExpoConfig): Record<string, string | LocaleJson> | null {
  return (config.android && config.android.locales) ?? null;
}

export async function setLocalesAsync(
  config: ExpoConfig,
  projectDirectory: string
): Promise<boolean> {
  const locales = getLocales(config);
  if (!locales) {
    return false;
  }

  const localesMap = await getResolvedLocalesAsync(projectDirectory, locales);

  for (const [lang, localizationObj] of Object.entries(localesMap)) {
    const stringsPath = await getProjectStringsXMLPathAsync(projectDirectory, {
      kind: `values-${lang}`,
    });

    if (!stringsPath) {
      throw new Error(`There was a problem setting the locale in ${stringsPath}.`);
    }

    const stringsJSON = await readResourcesXMLAsync({ path: stringsPath });

    for (const [name, value] of Object.entries(localizationObj)) {
      setStringItem([buildResourceItem({ name, value })], stringsJSON);
    }

    try {
      await writeXMLAsync({ path: stringsPath, xml: stringsJSON });
    } catch (e) {
      throw new Error(`Error setting locale. Cannot write strings.xml to ${stringsPath}.`);
    }
  }

  return true;
}

export async function getResolvedLocalesAsync(
  projectRoot: string,
  input: ExpoConfigLocales
): Promise<ResolvedLocalesJson> {
  const locales: ResolvedLocalesJson = {};
  for (const [lang, localeJsonPath] of Object.entries(input)) {
    if (typeof localeJsonPath === 'string') {
      try {
        locales[lang] = await JsonFile.readAsync(join(projectRoot, localeJsonPath));
      } catch (e) {
        // Add a warning when a json file cannot be parsed.
        addWarningAndroid(
          `locales-${lang}`,
          `Failed to parse JSON of locale file for language: ${lang}`,
          'https://docs.expo.io/distribution/app-stores/#localizing-your-android-app'
        );
      }
    } else {
      // In the off chance that someone defined the locales json in the config, pass it directly to the object.
      // We do this to make the types more elegant.
      locales[lang] = localeJsonPath;
    }
  }

  return locales;
}
