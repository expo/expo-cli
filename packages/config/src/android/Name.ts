import { ExpoConfig } from '../Config.types';
import { assert } from '../Errors';
import { createStringsXmlPlugin } from '../plugins/android-plugins';
import { buildResourceItem, readResourcesXMLAsync, ResourceXML } from './Resources';
import { getProjectStringsXMLPathAsync, removeStringItem, setStringItem } from './Strings';
import { writeXMLAsync } from './XML';

export const withName = createStringsXmlPlugin(applyNameFromConfig, 'withName');

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
