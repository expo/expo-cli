import { Parser } from 'xml2js';
import { ExpoConfig } from '../Config.types';
import {
  getProjectAndroidManifestPathAsync,
  readAndroidManifestAsync,
  writeAndroidManifestAsync,
} from './Manifest';

export function getScheme(config: ExpoConfig) {
  return typeof config.scheme === 'string' ? config.scheme : null;
}

export async function setScheme(config: ExpoConfig, projectDirectory: string) {
  let scheme = getScheme(config);
  if (!scheme) {
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

  const schemeTag = `<data android:scheme="${scheme}"/>`;
  const intentFiltersXML = `
  <intent-filter>
    ${schemeTag}
    <action android:name="android.intent.action.VIEW"/>
    <category android:name="android.intent.category.DEFAULT"/>
    <category android:name="android.intent.category.BROWSABLE"/>
  </intent-filter>`;
  const parser = new Parser();
  const intentFiltersJSON = await parser.parseStringPromise(intentFiltersXML);

  if (mainActivity[0].hasOwnProperty('intent-filter')) {
    mainActivity[0]['intent-filter'] = mainActivity[0]['intent-filter'].concat(
      intentFiltersJSON['intent-filter']
    );
  } else {
    mainActivity[0]['intent-filter'] = intentFiltersJSON['intent-filter'];
  }

  try {
    await writeAndroidManifestAsync(manifestPath, androidManifestJson);
  } catch (e) {
    throw new Error(
      `Error setting Android orientation. Cannot write new AndroidManifest.xml to ${manifestPath}.`
    );
  }
  return true;
}
