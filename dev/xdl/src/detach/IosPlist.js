import fs from 'fs-extra';
import path from 'path';
import plist from 'plist';

import { spawnAsyncThrowError } from './ExponentTools';

function _getNormalizedPlistFilename(plistName) {
  let plistFilename;
  if (plistName.indexOf('.') !== -1) {
    plistFilename = plistName;
  } else {
    plistFilename = `${plistName}.plist`;
  }
  return plistFilename;
}

/**
 *  @param plistName base filename of property list. if no extension, assumes .plist
 */
async function modifyAsync(plistPath, plistName, transform) {
  let plistFilename = _getNormalizedPlistFilename(plistName);
  let configPlistName = path.join(plistPath, plistFilename);
  let configFilename = path.join(plistPath, `${plistName}.json`);

  // grab original plist as json object
  let config;
  if (process.platform === 'darwin') {
    await spawnAsyncThrowError('plutil', [
      '-convert',
      'json',
      configPlistName,
      '-o',
      configFilename,
    ]);
    let configContents = await fs.readFile(configFilename, 'utf8');

    try {
      config = JSON.parse(configContents);
    } catch (e) {
      console.log(`Error parsing ${configFilename}`, e);
      console.log('The erroneous file contents was:', configContents);
      config = {};
    }
  } else {
    config = plist.parse(fs.readFileSync(configPlistName, 'utf8'));
  }

  // apply transformation
  config = transform(config);

  // back up old plist and swap in modified one
  await spawnAsyncThrowError('/bin/cp', [configPlistName, `${configPlistName}.bak`]);
  await fs.writeFile(configFilename, JSON.stringify(config));
  if (process.platform === 'darwin') {
    await spawnAsyncThrowError('plutil', [
      '-convert',
      'xml1',
      configFilename,
      '-o',
      configPlistName,
    ]);
  } else {
    await fs.writeFile(configPlistName, plist.build(config));
  }

  return config;
}

async function createBlankAsync(plistPath, plistName) {
  // write empty json file
  const emptyConfig = {};
  const tmpConfigFile = path.join(plistPath, `${plistName}.json`);
  await fs.writeFile(tmpConfigFile, JSON.stringify(emptyConfig));

  // convert to plist
  let plistFilename = _getNormalizedPlistFilename(plistName);
  let configPlistName = path.join(plistPath, plistFilename);
  if (process.platform === 'darwin') {
    await spawnAsyncThrowError('plutil', [
      '-convert',
      'xml1',
      tmpConfigFile,
      '-o',
      configPlistName,
    ]);
  } else {
    await fs.writeFile(configPlistName, JSON.stringify(plist.build(emptyConfig)));
  }

  // remove tmp json file
  await spawnAsyncThrowError('/bin/rm', [tmpConfigFile]);
}

async function cleanBackupAsync(plistPath, plistName, restoreOriginal = true) {
  let plistFilename = _getNormalizedPlistFilename(plistName);
  let configPlistName = path.join(plistPath, plistFilename);
  let configFilename = path.join(plistPath, `${plistName}.json`);

  if (restoreOriginal) {
    await spawnAsyncThrowError('/bin/cp', [`${configPlistName}.bak`, configPlistName]);
  }

  await spawnAsyncThrowError('/bin/rm', [`${configPlistName}.bak`]);
  await spawnAsyncThrowError('/bin/rm', [configFilename]);
}

export { modifyAsync, cleanBackupAsync, createBlankAsync };
