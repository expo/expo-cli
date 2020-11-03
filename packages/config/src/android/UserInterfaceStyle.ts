import { ExpoConfig } from '../Config.types';
import { AndroidManifest, getMainActivity } from './Manifest';

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

export function getUserInterfaceStyle(
  config: Pick<ExpoConfig, 'android' | 'userInterfaceStyle'>
): string | null {
  return config.android?.userInterfaceStyle ?? config.userInterfaceStyle ?? null;
}

export async function setUiModeAndroidManifest(
  config: Pick<ExpoConfig, 'android' | 'userInterfaceStyle'>,
  manifest: AndroidManifest
) {
  const userInterfaceStyle = getUserInterfaceStyle(config);
  if (!userInterfaceStyle) {
    return manifest;
  }

  let mainActivity = getMainActivity(manifest);
  if (!mainActivity) {
    mainActivity = { $: { 'android:name': '.MainActivity' } };
  }
  mainActivity.$[CONFIG_CHANGES_ATTRIBUTE] =
    'keyboard|keyboardHidden|orientation|screenSize|uiMode';

  return manifest;
}

export function addOnConfigurationChangedMainActivity(
  config: Pick<ExpoConfig, 'android' | 'userInterfaceStyle'>,
  mainActivity: string
): string {
  const userInterfaceStyle = getUserInterfaceStyle(config);
  if (!userInterfaceStyle) {
    return mainActivity;
  }

  // Cruzan: this is not ideal, but I'm not sure of a better way to handle writing to MainActivity.java
  if (mainActivity.match(`onConfigurationChanged`)?.length) {
    return mainActivity;
  }

  const MainActivityWithImports = addJavaImports(mainActivity, [
    'android.content.Intent',
    'android.content.res.Configuration',
  ]);

  const pattern = new RegExp(`public class MainActivity extends ReactActivity {`);
  return MainActivityWithImports.replace(pattern, ON_CONFIGURATION_CHANGED);
}

// TODO: we should have a generic utility for doing this
function addJavaImports(javaSource: string, javaImports: string[]): string {
  const lines = javaSource.split('\n');
  const lineIndexWithPackageDeclaration = lines.findIndex(line => line.match(/^package .*;$/));
  for (const javaImport of javaImports) {
    if (!javaSource.includes(javaImport)) {
      const importStatement = `import ${javaImport};`;
      lines.splice(lineIndexWithPackageDeclaration + 1, 0, importStatement);
    }
  }
  return lines.join('\n');
}
