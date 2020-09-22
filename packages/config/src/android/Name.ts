import { ConfigPlugin, ExpoConfig } from '../Config.types';
import { withStrings } from '../plugins/withAndroid';
import { Document } from './Manifest';
import { removeStringItem, setStringItem } from './Strings';

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
    return setStringItem([{ $: { name: 'app_name' }, _: name }], stringsJSON);
  }
  return removeStringItem('app_name', stringsJSON);
}
