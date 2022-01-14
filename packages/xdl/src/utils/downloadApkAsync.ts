import { downloadAppAsync, UserSettings, Versions } from '@expo/api';
import fs from 'fs-extra';
import path from 'path';

function _apkCacheDirectory() {
  const directory = path.join(UserSettings.getDirectory(), 'android-apk-cache');
  fs.mkdirpSync(directory);
  return directory;
}

export async function downloadApkAsync(
  url?: string,
  downloadProgressCallback?: (roundedProgress: number) => void
) {
  if (!url) {
    const versions = await Versions.versionsAsync();
    url = versions.androidUrl;
  }

  const filename = path.parse(url).name;
  const apkPath = path.join(_apkCacheDirectory(), `${filename}.apk`);

  if (await fs.pathExists(apkPath)) {
    return apkPath;
  }

  await downloadAppAsync(url, apkPath, undefined, downloadProgressCallback);
  return apkPath;
}
