import { ExpoConfig } from '../Config.types';
import { assert } from '../Errors';
import { ConfigPlugin } from '../Plugin.types';
import { withStringsXml } from '../plugins/android-plugins';
import { buildResourceItem, readResourcesXMLAsync, ResourceXML } from './Resources';
import { getProjectStringsXMLPathAsync, removeStringItem, setStringItem } from './Strings';
import { writeXMLAsync } from './XML';

export const withName: ConfigPlugin<void> = config => {
  return withStringsXml(config, props => ({
    ...props,
    data: applyName(getName(props), props.modResults),
  }));
};

export function getName(config: ExpoConfig) {
  return typeof config.name === 'string' ? config.name : null;
}

/**
 * Changes the display name on the home screen,
 * notifications, and others.
 */
export async function setName(config: ExpoConfig, projectDirectory: string): Promise<boolean> {
  const name = getName(config);
  if (!name) {
    // TODO: Maybe just remove the value from strings instead?
    return false;
  }

  const stringsPath = await getProjectStringsXMLPathAsync(projectDirectory);

  assert(stringsPath);

  let stringsJSON = await readResourcesXMLAsync({ path: stringsPath });
  stringsJSON = applyName(name, stringsJSON);

  try {
    await writeXMLAsync({ path: stringsPath, xml: stringsJSON });
  } catch {
    throw new Error(`Error setting name. Cannot write strings.xml to ${stringsPath}.`);
  }
  return true;
}

function applyName(name: string | null, stringsJSON: ResourceXML): ResourceXML {
  if (name) {
    return setStringItem([buildResourceItem({ name: 'app_name', value: name })], stringsJSON);
  }
  return removeStringItem('app_name', stringsJSON);
}
