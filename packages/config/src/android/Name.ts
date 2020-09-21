import { ConfigPlugin, ExpoConfig } from '../Config.types';
import { withStrings } from '../plugins/withAndroid';
import { Document } from './Manifest';
import {
  getProjectStringsXMLPathAsync,
  readStringsXMLAsync,
  removeStringItem,
  setStringItem,
  writeStringsXMLAsync,
} from './Strings';
import { XMLItem } from './Styles';

export function getName(config: ExpoConfig) {
  return typeof config.name === 'string' ? config.name : null;
}

export const withName: ConfigPlugin = config => {
  return withStrings(config, props => ({
    ...props,
    data: applyName(config.expo, props.data),
  }));
};

function applyName(config: ExpoConfig, stringsJSON: Document): Document {
  const name = getName(config);

  if (name) {
    const stringItemToAdd: XMLItem[] = [{ _: name, $: { name: 'app_name' } }];

    return setStringItem(stringItemToAdd, stringsJSON);
  }
  return removeStringItem('app_name', stringsJSON);
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
  const stringItemToAdd: XMLItem[] = [{ _: name, $: { name: 'app_name' } }];
  stringsJSON = setStringItem(stringItemToAdd, stringsJSON);

  try {
    await writeStringsXMLAsync(stringsPath, stringsJSON);
  } catch (e) {
    throw new Error(`Error setting name. Cannot write strings.xml to ${stringsPath}.`);
  }
  return true;
}
