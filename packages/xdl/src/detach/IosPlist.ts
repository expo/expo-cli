import fs from 'fs-extra';
import path from 'path';
import plist from 'plist';

import { spawnAsyncThrowError } from './ExponentTools';
import logger from './Logger';

function _getNormalizedPlistFilename(plistName: string) {
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
async function modifyAsync(plistPath: string, plistName: string, transform: (config: any) => any) {
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
      logger.info(`Error parsing ${configFilename}`, e);
      logger.info('The erroneous file contents was:', configContents);
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

async function createBlankAsync(plistPath: string, plistName: string) {
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

async function cleanBackupAsync(plistPath: string, plistName: string, restoreOriginal = true) {
  let plistFilename = _getNormalizedPlistFilename(plistName);
  let configPlistName = path.join(plistPath, plistFilename);
  let configFilename = path.join(plistPath, `${plistName}.json`);
  const backupPlistPath = `${configPlistName}.bak`;

  if (restoreOriginal && (await fs.pathExists(backupPlistPath))) {
    await fs.copy(backupPlistPath, configPlistName);
  }

  await fs.remove(backupPlistPath);
  await fs.remove(configFilename);
}

export { modifyAsync, cleanBackupAsync, createBlankAsync };
