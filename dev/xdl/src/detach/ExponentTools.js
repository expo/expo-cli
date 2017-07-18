// Copyright 2015-present 650 Industries. All rights reserved.

'use strict';

import fs from 'fs';
import path from 'path';
import request from 'request';
import spawnAsyncQuiet from '@expo/spawn-async';

function parseSdkMajorVersion(expSdkVersion) {
  let sdkMajorVersion = 0;
  try {
    let versionComponents = expSdkVersion
      .split('.')
      .map(number => parseInt(number, 10));
    sdkMajorVersion = versionComponents[0];
  } catch (_) {}
  return sdkMajorVersion;
}

function saveUrlToPathAsync(url, path) {
  return new Promise(function(resolve, reject) {
    let stream = fs.createWriteStream(path);
    stream.on('close', () => {
      if (getFilesizeInBytes(path) < 10) {
        throw new Error(`{filename} is too small`);
      }
      resolve();
    });
    stream.on('error', reject);
    request(url).pipe(stream);
  });
}

function saveIconToPathAsync(projectRoot, pathOrURL, outPath) {
  const localPath = path.resolve(projectRoot, pathOrURL);
  return new Promise(function(resolve, reject) {
    let stream = fs.createWriteStream(outPath);
    stream.on('close', () => {
      if (getFilesizeInBytes(outPath) < 10) {
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

function getFilesizeInBytes(path) {
  let stats = fs.statSync(path);
  let fileSizeInBytes = stats['size'];
  return fileSizeInBytes;
}

async function getManifestAsync(url, headers) {
  let requestOptions = {
    url: url.replace('exp://', 'http://') + '/index.exp',
    headers,
  };

  let response = await request.promise(requestOptions);
  let responseBody = response.body;
  console.log('Using manifest:', responseBody);
  let manifest = JSON.parse(responseBody);

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
  let fileString = await fs.promise.readFile(filename, 'utf8');
  let newFileString = transform(fileString);
  if (newFileString !== null) {
    await fs.promise.writeFile(filename, newFileString);
  }
  return;
}

function getNormalizedPlistFilename(plistName) {
  let plistFilename;
  if (plistName.indexOf('.') !== -1) {
    plistFilename = plistName;
  } else {
    plistFilename = `${plistName}.plist`;
  }
  return plistFilename;
}

async function createBlankIOSPropertyListAsync(plistPath, plistName) {
  // write empty json file
  const emptyConfig = {};
  const tmpConfigFile = path.join(plistPath, `${plistName}.json`);
  await fs.promise.writeFile(tmpConfigFile, JSON.stringify(emptyConfig));

  // convert to plist
  let plistFilename = getNormalizedPlistFilename(plistName);
  let configPlistName = path.join(plistPath, plistFilename);
  await spawnAsyncThrowError('plutil', [
    '-convert',
    'xml1',
    tmpConfigFile,
    '-o',
    configPlistName,
  ]);

  // remove tmp json file
  await spawnAsyncThrowError('/bin/rm', [tmpConfigFile]);
  return;
}

/**
 *  @param plistName base filename of property list. if no extension, assumes .plist
 */
async function modifyIOSPropertyListAsync(plistPath, plistName, transform) {
  let plistFilename = getNormalizedPlistFilename(plistName);
  let configPlistName = path.join(plistPath, plistFilename);
  let configFilename = path.join(plistPath, `${plistName}.json`);

  // grab original plist as json object
  await spawnAsyncThrowError('plutil', [
    '-convert',
    'json',
    configPlistName,
    '-o',
    configFilename,
  ]);
  let configContents = await fs.promise.readFile(configFilename, 'utf8');
  let config;

  try {
    config = JSON.parse(configContents);
  } catch (e) {
    console.log(`Error parsing ${configFilename}`, e);
    console.log('The erroneous file contents was:', configContents);
    config = {};
  }

  // apply transformation
  config = transform(config);

  // back up old plist and swap in modified one
  await spawnAsyncThrowError('/bin/cp', [
    configPlistName,
    `${configPlistName}.bak`,
  ]);
  await fs.promise.writeFile(configFilename, JSON.stringify(config));
  await spawnAsyncThrowError('plutil', [
    '-convert',
    'xml1',
    configFilename,
    '-o',
    configPlistName,
  ]);
  return config;
}

async function cleanIOSPropertyListBackupAsync(
  plistPath,
  plistName,
  restoreOriginal = true
) {
  let plistFilename = getNormalizedPlistFilename(plistName);
  let configPlistName = path.join(plistPath, plistFilename);
  let configFilename = path.join(plistPath, `${plistName}.json`);

  if (restoreOriginal) {
    await spawnAsyncThrowError('/bin/cp', [
      `${configPlistName}.bak`,
      configPlistName,
    ]);
  }

  await spawnAsyncThrowError('/bin/rm', [`${configPlistName}.bak`]);
  await spawnAsyncThrowError('/bin/rm', [configFilename]);
  return;
}

function getAppleIconQualifier(iconSize, iconResolution) {
  let iconQualifier;
  if (iconResolution !== 1) {
    // e.g. "29x29@3x"
    iconQualifier = `${iconSize}x${iconSize}@${iconResolution}x`;
  } else {
    iconQualifier = `${iconSize}x${iconSize}`;
  }
  if (iconSize === 76 || iconSize === 83.5) {
    // ipad sizes require ~ipad at the end
    iconQualifier = `${iconQualifier}~ipad`;
  }
  return iconQualifier;
}

/**
 *  @return array [ width, height ] or nil if that fails for some reason.
 */
async function getImageDimensionsAsync(dirname, basename) {
  if (process.platform !== 'darwin') {
    console.warn('`sips` utility may or may not work outside of macOS');
  }
  let childProcess = await spawnAsyncThrowError(
    'sips',
    ['-g', 'pixelWidth', '-g', 'pixelHeight', basename],
    {
      cwd: dirname,
    }
  );
  let dimensions;
  try {
    // stdout looks something like 'pixelWidth: 1200\n pixelHeight: 800'
    const components = childProcess.stdout.split(/(\s+)/);
    dimensions = components.map(c => parseInt(c, 10)).filter(n => !isNaN(n));
  } catch (_) {}
  return dimensions;
}

/**
 * Based on keys in the given manifest,
 * ensure that the proper iOS icon images exist -- assuming Info.plist already
 * points at them under CFBundleIcons.CFBundlePrimaryIcon.CFBundleIconFiles.
 *
 * This only works on MacOS (as far as I know) because it uses the sips utility.
 */
async function configureIOSIconsAsync(
  manifest,
  destinationIconPath,
  projectRoot
) {
  if (process.platform !== 'darwin') {
    console.warn('`sips` utility may or may not work outside of macOS');
  }
  let defaultIconFilename;
  if (manifest.ios && manifest.ios.iconUrl) {
    defaultIconFilename = 'exp-icon.png';
    await saveUrlToPathAsync(
      manifest.ios.iconUrl,
      `${destinationIconPath}/${defaultIconFilename}`
    );
  } else if (manifest.iconUrl) {
    defaultIconFilename = 'exp-icon.png';
    await saveUrlToPathAsync(
      manifest.iconUrl,
      `${destinationIconPath}/${defaultIconFilename}`
    );
  } else if (projectRoot && manifest.icon) {
    defaultIconFilename = 'exp-icon.png';
    await saveIconToPathAsync(
      projectRoot,
      manifest.icon,
      `${destinationIconPath}/${defaultIconFilename}`
    );
  }

  let iconSizes = [20, 29, 40, 60, 76, 83.5];
  iconSizes.forEach(iconSize => {
    let iconResolutions;
    if (iconSize === 76) {
      // iPad has 1x and 2x icons for this size only
      iconResolutions = [1, 2];
    } else {
      iconResolutions = [2, 3];
    }
    iconResolutions.forEach(async iconResolution => {
      let iconQualifier = getAppleIconQualifier(iconSize, iconResolution);
      // TODO(nikki): Support local paths for these icons
      let iconKey = `iconUrl${iconQualifier}`;
      let rawIconFilename;
      let usesDefault = false;
      if (manifest.ios && manifest.ios.hasOwnProperty(iconKey)) {
        // manifest specifies an image just for this size/resolution, use that
        rawIconFilename = `exp-icon${iconQualifier}.png`;
        await saveUrlToPathAsync(
          manifest.ios[iconKey],
          `${destinationIconPath}/${rawIconFilename}`
        );
      } else {
        // use default manifest.iconUrl
        usesDefault = true;
        if (defaultIconFilename) {
          rawIconFilename = defaultIconFilename;
        } else {
          console.warn(
            `Manifest does not specify ios.${iconKey} nor a default iconUrl. Bundle will use the Expo logo.`
          );
          return;
        }
      }

      let iconFilename = `AppIcon${iconQualifier}.png`;
      let iconSizePx = iconSize * iconResolution;
      await spawnAsyncThrowError('/bin/cp', [rawIconFilename, iconFilename], {
        stdio: 'inherit',
        cwd: destinationIconPath,
      });
      await spawnAsyncThrowError('sips', ['-Z', iconSizePx, iconFilename], {
        stdio: ['ignore', 'ignore', 'inherit'], // only stderr
        cwd: destinationIconPath,
      });

      // reject non-square icons (because Apple will if we don't)
      const dims = await getImageDimensionsAsync(
        destinationIconPath,
        iconFilename
      );
      if (!dims || dims.length < 2 || dims[0] !== dims[1]) {
        throw new Error(
          `iOS icons must be square, the dimensions of ${iconFilename} are ${dims}`
        );
      }

      if (!usesDefault) {
        // non-default icon used, clean up the downloaded version
        await spawnAsyncThrowError('/bin/rm', [
          path.join(destinationIconPath, rawIconFilename),
        ]);
      }
    });
  });

  // clean up default icon
  if (defaultIconFilename) {
    await spawnAsyncThrowError('/bin/rm', [
      path.join(destinationIconPath, defaultIconFilename),
    ]);
  }
  return;
}

export {
  parseSdkMajorVersion,
  saveUrlToPathAsync,
  saveIconToPathAsync,
  getManifestAsync,
  getImageDimensionsAsync,
  spawnAsyncThrowError,
  spawnAsync,
  transformFileContentsAsync,
  modifyIOSPropertyListAsync,
  cleanIOSPropertyListBackupAsync,
  configureIOSIconsAsync,
  createBlankIOSPropertyListAsync,
};
