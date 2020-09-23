import { ExpoConfig } from '../Config.types';
import {
  getProjectStringsXMLPathAsync,
  readStringsXMLAsync,
  removeStringItem,
  setStringItem,
  StringsResourceXML,
} from './Strings';
import { writeXMLAsync } from './XML';

export function getName(config: ExpoConfig) {
  return typeof config.name === 'string' ? config.name : null;
}

/**
 * Changes the display name on the home screen,
 * notifications, and others.
 */
export async function setName(
  configOrName: ExpoConfig | string,
  projectDirectory: string
): Promise<boolean> {
  let name: string | null = null;
  if (typeof configOrName === 'string') {
    name = configOrName;
  } else {
    name = getName(configOrName);
  }
  if (!name) {
    // TODO: Maybe just remove the value from strings instead?
    return false;
  }

  const stringsPath = await getProjectStringsXMLPathAsync(projectDirectory);
  if (!stringsPath) {
    throw new Error(`There was a problem setting your Facebook App ID in ${stringsPath}.`);
  }

  let stringsJSON = await readStringsXMLAsync(stringsPath);
  stringsJSON = applyName(name, stringsJSON);

  try {
    await writeXMLAsync({ path: stringsPath, xml: stringsJSON });
  } catch (e) {
    throw new Error(`Error setting name. Cannot write strings.xml to ${stringsPath}.`);
  }
  return true;
}

function applyName(name: string | null, stringsJSON: StringsResourceXML): StringsResourceXML {
  if (name) {
    return setStringItem([{ $: { name: 'app_name' }, _: name }], stringsJSON);
  }
  return removeStringItem('app_name', stringsJSON);
}
