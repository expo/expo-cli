import { ExpoConfig } from '../Config.types';
import {
  getProjectAndroidManifestPathAsync,
  readAndroidManifestAsync,
  writeAndroidManifestAsync,
} from './Manifest';

export function getBranchApiKey(config: ExpoConfig) {
  return config.android?.config?.branch?.apiKey ?? null;
}

export async function setBranchApiKey(config: ExpoConfig, projectDirectory: string) {
  const apiKey = getBranchApiKey(config);
  const manifestPath = await getProjectAndroidManifestPathAsync(projectDirectory);

  if (!apiKey || !manifestPath) {
    return false;
  }

  let androidManifestJson = await readAndroidManifestAsync(manifestPath);
  let mainApplication = androidManifestJson.manifest.application.filter(
    (e: any) => e['$']['android:name'] === '.MainApplication'
  )[0];

  let existingBranchApiKeyItem;
  const newBranchApiKeyItem = {
    $: {
      'android:name': 'io.branch.sdk.BranchKey',
      'android:value': apiKey,
    },
  };
  if (mainApplication.hasOwnProperty('meta-data')) {
    existingBranchApiKeyItem = mainApplication['meta-data'].filter(
      (e: any) => e['$']['android:name'] === 'io.branch.sdk.BranchKey'
    );
    if (existingBranchApiKeyItem.length) {
      existingBranchApiKeyItem[0]['$']['android:value'] = apiKey;
    } else {
      mainApplication['meta-data'].push(newBranchApiKeyItem);
    }
  } else {
    mainApplication['meta-data'] = [newBranchApiKeyItem];
  }

  try {
    await writeAndroidManifestAsync(manifestPath, androidManifestJson);
  } catch (e) {
    throw new Error(
      `Error setting Android Branch API key. Cannot write new AndroidManifest.xml to ${manifestPath}.`
    );
  }
  return true;
}
