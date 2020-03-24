import { ExpoConfig } from '../Config.types';
import {
  getProjectAndroidManifestPathAsync,
  readAndroidManifestAsync,
  writeAndroidManifestAsync,
} from './Manifest';

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

export async function setUiModeAndroidManifest(config: ExpoConfig, projectDirectory: string) {
  let userInterfaceStyle = getUserInterfaceStyle(config);
  if (!userInterfaceStyle) {
    return false;
  }

  const manifestPath = await getProjectAndroidManifestPathAsync(projectDirectory);
  if (!manifestPath) {
    return false;
  }

  let androidManifestJson = await readAndroidManifestAsync(manifestPath);
  let mainActivity = androidManifestJson.manifest.application[0].activity.filter(
    (e: any) => e['$']['android:name'] === '.MainActivity'
  );
  mainActivity[0]['$'][CONFIG_CHANGES_ATTRIBUTE] =
    'keyboard|keyboardHidden|orientation|screenSize|uiMode';

  try {
    await writeAndroidManifestAsync(manifestPath, androidManifestJson);
  } catch (e) {
    throw new Error(
      `Error setting Android user interface style. Cannot write new AndroidManifest.xml to ${manifestPath}.`
    );
  }
  return true;
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
  let pattern = new RegExp(`public class MainActivity extends ReactActivity {`);
  return MainActivity.replace(pattern, ON_CONFIGURATION_CHANGED);
}
