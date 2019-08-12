import fs from 'fs';
import path from 'path';
import semver from 'semver';
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
  appVersion: string,
  sdkVersion?: string,
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

  const clientUrl = `https://dpq5q02fu5f55.cloudfront.net/Exponent-${appVersion}.tar.gz`;
  
  await updateClientUrlAndVersionAsync(sdkVersion, 'ios', clientUrl, appVersion);
}

export async function updateAndroidApk(
  s3Client: any,
  pathToApp: string,
  appVersion: string,
  sdkVersion?: string,
) {
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

  const clientUrl = `https://d1ahtucjixef4r.cloudfront.net/Exponent-${appVersion}.apk`;

  await updateClientUrlAndVersionAsync(sdkVersion, 'android', clientUrl, appVersion);
}

async function updateClientUrlAndVersionAsync(
  sdkVersion: string | undefined,
  platform: 'ios' | 'android',
  clientUrl: string,
  appVersion: string
) {
  // Unfortunately it needs to be of `any` type to be able to change dynamic keys in the object.
  const versions: any = await Versions.versionsAsync();

  // Create new SDK version config if not there yet.
  if (sdkVersion && !versions.sdkVersions[sdkVersion]) {
    versions.sdkVersions[sdkVersion] = {};
  }

  // For compatibility reason we have to maintain that global config, but only when we're updating the most recent SDK.
  if (!sdkVersion || Object.keys(versions.sdkVersions).sort(semver.rcompare)[0] === sdkVersion) {
    versions[`${platform}Version`] = appVersion;
    versions[`${platform}Url`] = clientUrl;
  }

  // Update SDK version config.
  if (sdkVersion) {
    const sdkVersionConfig = versions.sdkVersions[sdkVersion];
    sdkVersionConfig[`${platform}ClientUrl`] = clientUrl;
    sdkVersionConfig[`${platform}ClientVersion`] = appVersion;
  }

  await Versions.setVersionsAsync(versions);
}
