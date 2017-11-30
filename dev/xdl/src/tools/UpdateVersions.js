/**
 * @flow
 */

import fs from 'fs';
import path from 'path';
import spawnAsync from '@expo/spawn-async';
import * as Versions from '../Versions';

export async function updateSdkVersionsAsync(
  sdkVersion: string,
  reactNativeTag: string,
  facebookRNVersion: string,
  facebookReactVersion: string
) {
  let versions = await Versions.versionsAsync();
  versions.sdkVersions[sdkVersion] = {
    ...versions.sdkVersions[sdkVersion],
    expoReactNativeTag: reactNativeTag,
    facebookReactNativeVersion: facebookRNVersion,
    facebookReactVersion,
  };
  await Versions.setVersionsAsync(versions);
}

export async function updateIOSSimulatorBuild(
  s3Client: any,
  pathToApp: string,
  appVersion: string
) {
  let tempAppPath = path.join(process.cwd(), 'temp-app.tar.gz');

  await spawnAsync('tar', ['-zcvf', tempAppPath, '-C', pathToApp, '.'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'ignore', 'inherit'], // only stderr
  });

  let file = fs.createReadStream(tempAppPath);

  console.log('Uploading...');

  await s3Client
    .putObject({
      Bucket: 'exp-ios-simulator-apps',
      Key: `Exponent-${appVersion}.tar.gz`,
      Body: file,
      ACL: 'public-read',
    })
    .promise();

  await spawnAsync('rm', [tempAppPath]);

  console.log('Adding to server config...');

  let versions = await Versions.versionsAsync();
  versions['iosVersion'] = appVersion;
  versions['iosUrl'] = `https://dpq5q02fu5f55.cloudfront.net/Exponent-${appVersion}.tar.gz`;
  await Versions.setVersionsAsync(versions);
}

export async function updateAndroidApk(s3Client: any, pathToApp: string, appVersion: string) {
  let file = fs.createReadStream(pathToApp);

  console.log('Uploading...');

  await s3Client
    .putObject({
      Bucket: 'exp-android-apks',
      Key: `Exponent-${appVersion}.apk`,
      Body: file,
      ACL: 'public-read',
    })
    .promise();

  console.log('Adding to server config...');

  let versions = await Versions.versionsAsync();
  versions['androidVersion'] = appVersion;
  versions['androidUrl'] = `https://d1ahtucjixef4r.cloudfront.net/Exponent-${appVersion}.apk`;
  await Versions.setVersionsAsync(versions);
}
