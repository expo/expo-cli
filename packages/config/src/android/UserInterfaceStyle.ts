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

  let MainActivityWithImports = addJavaImports(MainActivity, [
    'android.content.Intent',
    'android.content.res.Configuration',
  ]);

  let pattern = new RegExp(`public class MainActivity extends ReactActivity {`);
  return MainActivityWithImports.replace(pattern, ON_CONFIGURATION_CHANGED);
}

// TODO: we should have a generic utility for doing this
function addJavaImports(javaSource: string, javaImports: string[]): string {
  const lines = javaSource.split('\n');
  const lineIndexWithPackageDeclaration = lines.findIndex(line => line.match(/^package .*;$/));
  for (let javaImport of javaImports) {
    if (!javaSource.includes(javaImport)) {
      const importStatement = `import ${javaImport};`;
      lines.splice(lineIndexWithPackageDeclaration + 1, 0, importStatement);
    }
  }
  return lines.join('\n');
}
