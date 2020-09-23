import { ExpoConfig } from '../Config.types';
import { Document, getMainActivity } from './Manifest';

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

export function getUserInterfaceStyle(config: ExpoConfig): string | null {
  return config.android?.userInterfaceStyle ?? config.userInterfaceStyle ?? null;
}

export async function setUiModeAndroidManifest(config: ExpoConfig, manifestDocument: Document) {
  const userInterfaceStyle = getUserInterfaceStyle(config);
  if (!userInterfaceStyle) {
    return manifestDocument;
  }

  const mainActivity = getMainActivity(manifestDocument);

  mainActivity['$'][CONFIG_CHANGES_ATTRIBUTE] =
    'keyboard|keyboardHidden|orientation|screenSize|uiMode';

  return manifestDocument;
}

export function addOnConfigurationChangedMainActivity(
  config: ExpoConfig,
  MainActivity: string
): string {
  const userInterfaceStyle = getUserInterfaceStyle(config);
  if (!userInterfaceStyle) {
    return MainActivity;
  }

  // Cruzan: this is not ideal, but I'm not sure of a better way to handle writing to MainActivity.java
  if (MainActivity.match(`onConfigurationChanged`)?.length) {
    return MainActivity;
  }

  const MainActivityWithImports = addJavaImports(MainActivity, [
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
