import { ExpoConfig } from '../Config.types';
import { Document } from './Manifest';

export const CONFIG_CHANGES_ATTRIBUTE = 'android:configChanges';

export const ON_CONFIGURATION_CHANGED = `
public class MainActivity extends ReactActivity {

    // Added automatically by Expo Config
    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        Intent intent = new Intent("onConfigurationChanged");
        intent.putExtra("newConfig", newConfig);
        sendBroadcast(intent);
    }
`;

export function getUserInterfaceStyle(config: ExpoConfig): string {
  let result = config.android?.userInterfaceStyle ?? config.userInterfaceStyle;
  return result ?? null;
}

export async function setUiModeAndroidManifest(config: ExpoConfig, manifestDocument: Document) {
  let userInterfaceStyle = getUserInterfaceStyle(config);
  if (!userInterfaceStyle) {
    return manifestDocument;
  }

  let mainActivity = manifestDocument.manifest.application[0].activity.filter(
    (e: any) => e['$']['android:name'] === '.MainActivity'
  );
  mainActivity[0]['$'][CONFIG_CHANGES_ATTRIBUTE] =
    'keyboard|keyboardHidden|orientation|screenSize|uiMode';

  return manifestDocument;
}

export function addOnConfigurationChangedMainActivity(
  config: ExpoConfig,
  MainActivity: string
): string {
  let userInterfaceStyle = getUserInterfaceStyle(config);
  if (!userInterfaceStyle) {
    return MainActivity;
  }

  // Cruzan: this is not ideal, but I'm not sure of a better way to handle writing to MainActivity.java
  if (MainActivity.match(`onConfigurationChanged`)?.length) {
    return MainActivity;
  }
  let pattern = new RegExp(`public class MainActivity extends ReactActivity {`);
  return MainActivity.replace(pattern, ON_CONFIGURATION_CHANGED);
}
