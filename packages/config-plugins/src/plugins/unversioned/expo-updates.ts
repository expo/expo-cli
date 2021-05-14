import { ConfigPlugin } from '../../Plugin.types';
import { withUpdates as withUpdatesAndroid } from '../../android/Updates';
import { withUpdates as withUpdatesIOS } from '../../ios/Updates';
import { createRunOncePlugin } from '../withRunOnce';
import { withStaticPlugin } from '../withStaticPlugin';

// Local unversioned updates plugin

const packageName = 'expo-updates';

export const withUpdates: ConfigPlugin<{ expoUsername: string }> = (config, props) => {
  return withStaticPlugin(config, {
    _isLegacyPlugin: true,
    // Pass props to the static plugin if it exists.
    plugin: [packageName, props],
    // If the static plugin isn't found, use the unversioned one.
    fallback: config => withUnversionedUpdates(config, props),
  });
};

const withUnversionedUpdates: ConfigPlugin<{ expoUsername: string }> = createRunOncePlugin(
  (config, props) => {
    config = withUpdatesAndroid(config, props);
    config = withUpdatesIOS(config, props);
    return config;
  },
  packageName
);

export default withUpdates;
