// Copyright 2015-present 650 Industries. All rights reserved.

'use strict';

import fs from 'fs-extra';
import path from 'path';
import Request from 'request-promise-native';
import rimraf from 'rimraf';
import spawnAsyncQuiet from '@expo/spawn-async';

const request = Request.defaults({
  resolveWithFullResponse: true,
});

function _getFilesizeInBytes(path) {
  let stats = fs.statSync(path);
  let fileSizeInBytes = stats['size'];
  return fileSizeInBytes;
}

function parseSdkMajorVersion(expSdkVersion) {
  let sdkMajorVersion = 0;
  try {
    let versionComponents = expSdkVersion.split('.').map(number => parseInt(number, 10));
    sdkMajorVersion = versionComponents[0];
  } catch (_) {}
  return sdkMajorVersion;
}

function saveUrlToPathAsync(url, path) {
  return new Promise(function(resolve, reject) {
    let stream = fs.createWriteStream(path);
    stream.on('close', () => {
      if (_getFilesizeInBytes(path) < 10) {
        throw new Error(`{filename} is too small`);
      }
      resolve();
    });
    stream.on('error', reject);
    request(url).pipe(stream);
  });
}

function saveImageToPathAsync(projectRoot, pathOrURL, outPath) {
  const localPath = path.resolve(projectRoot, pathOrURL);
  return new Promise(function(resolve, reject) {
    let stream = fs.createWriteStream(outPath);
    stream.on('close', () => {
      if (_getFilesizeInBytes(outPath) < 10) {
        throw new Error(`{filename} is too small`);
      }
      resolve();
    });
    stream.on('error', reject);
    if (fs.existsSync(localPath)) {
      fs.createReadStream(localPath).pipe(stream);
    } else {
      request(pathOrURL).pipe(stream);
    }
  });
}

async function getManifestAsync(url, headers) {
  let requestOptions = {
    url: url.replace('exp://', 'http://') + '/index.exp',
    headers,
  };

  let response = await request(requestOptions);
  let responseBody = response.body;
  console.log('Using manifest:', responseBody);
  let manifest;
  try {
    manifest = JSON.parse(responseBody);
  } catch (e) {
    throw new Error(`Unable to parse manifest: ${e}`);
  }

  return manifest;
}

async function spawnAsyncThrowError(...args) {
  if (args.length === 2) {
    return spawnAsyncQuiet(args[0], args[1], {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
  } else {
    return spawnAsyncQuiet(...args);
  }
}

async function spawnAsync(...args) {
  try {
    return await spawnAsyncThrowError(...args);
  } catch (e) {
    console.error(e.message);
  }
}

async function transformFileContentsAsync(filename, transform) {
  let fileString = await fs.readFile(filename, 'utf8');
  let newFileString = transform(fileString);
  if (newFileString !== null) {
    await fs.writeFile(filename, newFileString);
  }
}

function manifestUsesSplashApi(manifest, platform) {
  if (platform === 'ios') {
    return manifest.splash || (manifest.ios && manifest.ios.splash);
  }
  if (platform === 'android') {
    return manifest.splash || (manifest.android && manifest.android.splash);
  }
  return false;
}

function rimrafDontThrow(directory) {
  try {
    rimraf.sync(directory);
  } catch (e) {
    console.warn(
      `There was an issue cleaning up, but your project should still work. You may need to manually remove ${directory}. (${e})`
    );
  }
}

function isDirectory(dir) {
  try {
    if (fs.statSync(dir).isDirectory()) {
      return true;
    }

    return false;
  } catch (e) {
    return false;
  }
}

export {
  isDirectory,
  parseSdkMajorVersion,
  saveUrlToPathAsync,
  saveImageToPathAsync,
  getManifestAsync,
  rimrafDontThrow,
  spawnAsyncThrowError,
  spawnAsync,
  transformFileContentsAsync,
  manifestUsesSplashApi,
};
