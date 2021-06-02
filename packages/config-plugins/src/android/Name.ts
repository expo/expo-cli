import { ExpoConfig } from '@expo/config-types';
import assert from 'assert';

import { ConfigPlugin } from '../Plugin.types';
import { createStringsXmlPlugin, withSettingsGradle } from '../plugins/android-plugins';
import { writeXMLAsync } from '../utils/XML';
import { addWarningAndroid } from '../utils/warnings';
import { buildResourceItem, readResourcesXMLAsync, ResourceXML } from './Resources';
import { getProjectStringsXMLPathAsync, removeStringItem, setStringItem } from './Strings';

/**
 * Sanitize a name, this should be used for files and gradle names.
 * - `[/, \, :, <, >, ", ?, *, |]` are not allowed https://bit.ly/3l6xqKL
 *
 * @param name
 */
export function sanitizeNameForGradle(name: string): string {
  // Gradle disallows these:
  // The project name 'My-Special 😃 Co/ol_Project' must not contain any of the following characters: [/, \, :, <, >, ", ?, *, |]. Set the 'rootProject.name' or adjust the 'include' statement (see https://docs.gradle.org/6.2/dsl/org.gradle.api.initialization.Settings.html#org.gradle.api.initialization.Settings:include(java.lang.String[]) for more details).
  return name.replace(/(\/|\\|:|<|>|"|\?|\*|\|)/g, '');
}

export const withName = createStringsXmlPlugin(applyNameFromConfig, 'withName');

export const withNameSettingsGradle: ConfigPlugin = config => {
  return withSettingsGradle(config, config => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = applyNameSettingsGradle(config, config.modResults.contents);
    } else {
      addWarningAndroid(
        'android-name-settings-gradle',
        `Cannot automatically configure settings.gradle if it's not groovy`
      );
    }
    return config;
  });
};

export function getName(config: Pick<ExpoConfig, 'name'>) {
  return typeof config.name === 'string' ? config.name : null;
}

/**
 * Changes the display name on the home screen,
 * notifications, and others.
 */
export async function setName(
  config: Pick<ExpoConfig, 'name'>,
  projectRoot: string
): Promise<boolean> {
  const stringsPath = await getProjectStringsXMLPathAsync(projectRoot);
  assert(stringsPath);

  let stringsJSON = await readResourcesXMLAsync({ path: stringsPath });
  stringsJSON = applyNameFromConfig(config, stringsJSON);

  try {
    await writeXMLAsync({ path: stringsPath, xml: stringsJSON });
  } catch {
    throw new Error(`Error setting name. Cannot write strings.xml to ${stringsPath}.`);
  }
  return true;
}

function applyNameFromConfig(
  config: Pick<ExpoConfig, 'name'>,
  stringsJSON: ResourceXML
): ResourceXML {
  const name = getName(config);
  if (name) {
    return setStringItem([buildResourceItem({ name: 'app_name', value: name })], stringsJSON);
  }
  return removeStringItem('app_name', stringsJSON);
}

/**
 * Regex a name change -- fragile.
 *
 * @param config
 * @param settingsGradle
 */
export function applyNameSettingsGradle(config: Pick<ExpoConfig, 'name'>, settingsGradle: string) {
  const name = sanitizeNameForGradle(getName(config) ?? '');

  // Select rootProject.name = '***' and replace the contents between the quotes.
  return settingsGradle.replace(
    /rootProject.name\s?=\s?(["'])(?:(?=(\\?))\2.)*?\1/g,
    `rootProject.name = '${name}'`
  );
}
